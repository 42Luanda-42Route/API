import { Server } from "socket.io"
import { FastifyInstance } from "fastify"
import prisma from "../infrastructure/database/prismaClient";
import { RouteLocationState } from "../domain/routes/Route";


const routeLocationState: Record <number, RouteLocationState> = {};

const DRIVER_TIMEOUT = 10_000; //10 segundos  

function isDriveActive(routeId: number){
    
    const state = routeLocationState[routeId];
    if (!state) return false;

    return(
        state.source === "driver" &&
        Date.now() - state.lastUpdate < DRIVER_TIMEOUT
    );

}


export function initSocket(app: FastifyInstance){
    console.log('\n🔌======================= INICIALIZANDO SOCKET.IO =======================🔌');
    
    const io = new Server(app.server, {
        cors:{
            origin: "*"
        },
        // Configuração para evitar timeouts
        pingInterval: 10000,      // Enviar ping a cada 10 segundos
        pingTimeout: 5000,       // Aguardar 5 segundos para pong antes de desconectar
        transports: ["websocket", "polling"],
        connectionStateRecovery: {
            maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
            skipMiddlewares: true,
        }
    });
    
    console.log('📡 Socket.IO Server criado com sucesso');
    console.log('✅ Transports habilitados: websocket, polling');
    console.log('✅ CORS Origin: *');
    
    (app.server as any).io = io;

    // Listeners no servidor Socket.IO
    io.on("error", (error: any) => {
        console.error('\n❌ [Socket.IO Server Error]', error);
    });

    io.on("connection_error", (error: any) => {
        console.error('\n❌ [Socket.IO Connection Error]', error);
    });


    io.on("connection", (socket) =>{
        console.log("\n🟢 ╔════════════════════════════════════════╗");
        console.log("🟢 ║   NOVO CLIENTE CONECTADO AO WEBSOCKET  ║");
        console.log("🟢 ╚════════════════════════════════════════╝");
        console.log(`🟢 Socket ID: ${socket.id}`);
        console.log("📡 Transport:", socket.handshake.headers['upgrade'] || 'polling');
        console.log("🌐 IP Cliente:", socket.handshake.address);
        console.log("🟢 ═══════════════════════════════════════════");

        // ✅ Listener genérico para TODOS os eventos
        socket.onAny((event: string, ...args: any[]) => {
            if (!event.includes('ping') && !event.includes('pong')) {
                console.log(`\n📨 [${socket.id}] EVENTO RECEBIDO: "${event}"`);
                console.log(`   Dados:`, JSON.stringify(args, null, 2));
            }
        });

        socket.on('disconnect', (reason) => {
            console.log(`\n🔴 ╔════════════════════════════════════════╗`);
            console.log(`🔴 ║   CLIENTE DESCONECTADO DO WEBSOCKET   ║`);
            console.log(`🔴 ╚════════════════════════════════════════╝`);
            console.log(`🔴 Socket ID: ${socket.id}`);
            console.log(`🔴 Motivo: ${reason}`);
        });

        socket.on("connect_error", (error) => {
            console.error("❌ Erro de conexão:", error.message, error.cause);
        });

        socket.on("error", (error) => {
            console.error("❌ Erro WebSocket:", error);
        });

        socket.on('ping', () => {
            socket.emit('pong');
        });

        // });


        /**
         * Mostorista entra no room rota
         */
        socket.on("driver:joinRoute", async({driverId}) =>{
            console.log(`\n✅ HANDLER: driver:joinRoute`);
            console.log(`   Input: { driverId: ${driverId} }`);
            
            const driver = await prisma.drivers.findUnique({
                where: {id: driverId}
            });

            console.log(`   Driver encontrado:`, driver ? `${driver.full_name} (ID: ${driver.id})` : 'NÃO ENCONTRADO');
            console.log(`   Rota atual: ${driver?.current_route_id || 'NENHUMA'}`);

            if (!driver?.current_route_id) {
                console.log(`   ⚠️ Driver sem rota atribuída, retornando`);
                return;
            }

            const room = `route_${driver.current_route_id}`;
            socket.join(room);

            console.log(`   ✅ Driver ${driverId} entrou no room ${room}`);
        });

        /**
         * Motorista sai do room da rota
         */
        socket.on("driver:leaveRoute", async({driverId}) =>{
            console.log(`\n✅ HANDLER: driver:leaveRoute`);
            console.log(`   Input: { driverId: ${driverId} }`);
            
            const driver = await prisma.drivers.findUnique({
                where: {id: driverId}
            });

            console.log(`   Driver encontrado:`, driver ? `${driver.full_name}` : 'NÃO ENCONTRADO');
            console.log(`   Rota atual: ${driver?.current_route_id || 'NENHUMA'}`);

            if (!driver?.current_route_id) {
                console.log(`   ⚠️ Driver sem rota, retornando`);
                return;
            }

            const room = `route_${driver.current_route_id}`;
            socket.leave(room);

            // Limpar estado da rota para permitir cadete fallback
            delete routeLocationState[driver.current_route_id];

            console.log(`   ✅ Driver ${driverId} saiu do room ${room}`);
        });
























        /**
         * Cadete entra no room da rota
         */
        socket.on("cadete:joinRoute", async({cadeteId})=>{
            console.log(`\n✅ HANDLER: cadete:joinRoute`);
            console.log(`   Input: { cadeteId: ${cadeteId} }`);
            
            const cadete = await prisma.cadetes.findUnique({
                where: {id: cadeteId},
                include:{
                    stop:{
                        include:{
                            route: true
                        }
                    }
                }
            });
            
            const cadeteRouteId = cadete?.stop?.route?.id;
            console.log(`   Cadete encontrado:`, cadete ? `${cadete.full_name}` : 'NÃO ENCONTRADO');
            console.log(`   Rota ID: ${cadeteRouteId || 'NENHUMA'}`);
            
            if (!cadeteRouteId) {
                console.log(`   ⚠️ Cadete sem rota atribuída, retornando`);
                return;
            }

            const room = `route_${cadeteRouteId}`;
            socket.join(room);
            console.log(`   ✅ Cadete ${cadeteId} entrou no room ${room}`);
        });
        




































        /**
         * Atualizacao de localizacao do motorista
         */
        /**
         * Handler: Motorista atualiza localização via socket
         * - Valida motorista e rota
         * - Salva coordenadas no BD
         * - Broadcast para cadetes da rota
         */
        socket.on("driver:updateLocation", async(data) =>{
            console.log(`\n✅ HANDLER: driver:updateLocation`);
            console.log(`   Input Data:`, JSON.stringify(data, null, 2));
            
            const {id_driver, lat, long} = data;

            // ─── Validação: Campos obrigatórios ────────────────────────────
            if (!id_driver || lat === undefined || long === undefined) {
                console.error(`   ❌ Dados inválidos: id_driver=${id_driver}, lat=${lat}, long=${long}`);
                socket.emit("socket:error", {
                    event: "driver:updateLocation",
                    message: "Missing required fields: id_driver, lat, long"
                });
                return;
            }

            // ─── Buscar driver do BD ───────────────────────────────────────
            const driver = await prisma.drivers.findUnique({ 
                where: { id: id_driver }
            });
            
            if (!driver) {
                console.error(`   ❌ Driver não encontrado: id=${id_driver}`);
                socket.emit("socket:error", {
                    event: "driver:updateLocation",
                    message: `Driver with id ${id_driver} not found.`
                });
                return;
            }

            // ─── Validação: Driver tem rota atribuída ─────────────────────
            if (!driver.current_route_id) {
                console.warn(`   ⚠️ Driver ${driver.full_name} não tem rota atribuída`);
                socket.emit("socket:error", {
                    event: "driver:updateLocation",
                    message: "Driver is not assigned to any route."
                });
                return;
            }

            // ─── Atualizar estado global da rota ───────────────────────────
            const routeId = driver.current_route_id;
            routeLocationState[routeId] = {
                source: "driver",
                sourceId: driver.id,
                lastUpdate: Date.now(),
                sourceName: driver.full_name
            };
            console.log(`   ✅ Estado da rota ${routeId} atualizado (motorista ativo)`);

            // ─── Salvar coordenadas no BD ──────────────────────────────────
            try {
                await prisma.driverCoordinates.upsert({
                    where: { id_driver },
                    update: { lat, long },
                    create: { id_driver, lat, long }
                });
                console.log(`   ✅ Coordenadas salvas: (${lat}, ${long})`);
            } catch (err) {
                console.error(`   ❌ Erro ao salvar coordenadas:`, err);
                socket.emit("socket:error", {
                    event: "driver:updateLocation",
                    message: "Failed to save coordinates."
                });
                return;
            }

            // ─── Broadcast para cadetes da rota ───────────────────────────
            const room = `route_${routeId}`;
            console.log(`   📡 Emitindo para ${room}`);

            io.to(room).emit("driver:location", {
                id_driver,
                lat,
                long,
                routeId,
                driverName: driver.full_name
            });
            console.log(`   ✅ Localização do motorista emitida para ${room}`);
        });











        /**
         * Handler: Cadete atualiza localização via socket
         * - Apenas quando motorista está inativo
         * - Valida cadete e rota
         * - Broadcast para outros cadetes/motoristas da rota
         */
        socket.on("cadete:updateLocation", async (data) =>{
            console.log(`\n✅ HANDLER: cadete:updateLocation`);
            console.log(`   Input Data:`, JSON.stringify(data, null, 2));
            
            const { cadeteId, lat, long, sourceName } = data;

            // ─── Validação: Campos obrigatórios ────────────────────────────
            if (!cadeteId || lat === undefined || long === undefined) {
                console.error(`   ❌ Dados inválidos: cadeteId=${cadeteId}, lat=${lat}, long=${long}`);
                socket.emit("socket:error", {
                    event: "cadete:updateLocation",
                    message: "Missing required fields: cadeteId, lat, long"
                });
                return;
            }

            // ─── Buscar cadete e sua rota do BD ────────────────────────────
            const cadete = await prisma.cadetes.findUnique({
                where: { id: cadeteId },
                include: {
                    stop: {
                        include: { route: true }
                    }
                }
            });

            if (!cadete) {
                console.error(`   ❌ Cadete não encontrado: id=${cadeteId}`);
                socket.emit("socket:error", {
                    event: "cadete:updateLocation",
                    message: `Cadete with id ${cadeteId} not found.`
                });
                return;
            }

            const routeId = cadete?.stop?.route?.id;
            
            if (!routeId) {
                console.error(`   ❌ Cadete não tem rota atribuída`);
                socket.emit("socket:error", {
                    event: "cadete:updateLocation",
                    message: "Cadete is not assigned to any route."
                });
                return;
            }

            // ─── Validação: Motorista não está ativo ──────────────────────
            const driverActive = isDriveActive(routeId);
            console.log(`   📊 Status do motorista na rota ${routeId}: ${driverActive ? 'ATIVO' : 'INATIVO'}`);

            if (driverActive) {
                console.warn(`   ⚠️ Localização ignorada: motorista está ativo`);
                socket.emit("socket:ignored", {
                    event: "cadete:updateLocation",
                    message: "Driver is active on this route."
                });
                return;
            }

            // ─── Atualizar estado global da rota ───────────────────────────
            routeLocationState[routeId] = {
                source: "cadete",
                sourceId: cadeteId,
                lastUpdate: Date.now(),
                sourceName: cadete.full_name
            };
            console.log(`   ✅ Estado da rota ${routeId} atualizado (cadete ativo)`);

            // ─── Broadcast para rota ──────────────────────────────────────
            const room = `route_${routeId}`;
            console.log(`   📡 Emitindo para ${room}`);

            io.to(room).emit("transport:location", {
                cadeteId,
                lat,
                long,
                source: "cadete",
                routeId,
                cadeteName: cadete.full_name
            });
            console.log(`   ✅ Localização do cadete emitida para ${room}`);
        });






















        //Desconectar socket
        socket.on("disconnect", (reason) =>{
            console.log("🔴 Socket disconnected: ", socket.id, " Motivo:", reason);
        });

    });
}