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
    (app.server as any).io = io;


    io.on("connection", (socket) =>{
        console.log("🟢 Socket conectado: ", socket.id);

        socket.on('disconnect', (reason) => {
            console.log(`🔴 Socket desconectado: ${socket.id}, motivo: ${reason}`);
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
            const driver = await prisma.drivers.findUnique({
                where: {id: driverId}
            });

            if (!driver?.current_route_id) return;

            const room = `route_${driver.current_route_id}`;
            socket.join(room);

            console.log(`🚗 Driver ${driverId} entrou no room ${room}`);
        });

        /**
         * Motorista sai do room da rota
         */
        socket.on("driver:leaveRoute", async({driverId}) =>{
            const driver = await prisma.drivers.findUnique({
                where: {id: driverId}
            });

            if (!driver?.current_route_id) return;

            const room = `route_${driver.current_route_id}`;
            socket.leave(room);

            // Limpar estado da rota para permitir cadete fallback
            delete routeLocationState[driver.current_route_id];

            console.log(`🚗 Driver ${driverId} saiu do room ${room}`);
        });
























        /**
         * Cadete entra no room da rota
         */
        socket.on("cadete:joinRoute", async({cadeteId})=>{
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
            // if(!cadete)
            //     throw NotfoudExpt
            const cadeteRouteId = cadete?.stop?.route?.id
            
            if (!cadeteRouteId) return;

            const room = `route_${cadeteRouteId}`;
            socket.join(room);
            console.log(`🎓 Cadete ${cadeteId} entrou no room ${room}`);
        });
        




































        /**
         * Atualizacao de localizacao do motorista 5427
         */
        socket.on("driver:updateLocation", async(data) =>{
            const {id_driver, lat, long} = data;
   
            const driver = await prisma.drivers.findUnique({ where: {id: id_driver}});

            if (!driver?.current_route_id) {
                socket.emit("socket:error", {
                    event: "driver:updateLocation",
                    message: "Driver is not assigned to any route."
                });
                return;
            }



            //Atualizar estado da rota-------------------------------------
            const routeId =  driver?.current_route_id;
            routeLocationState[routeId]={
                source: "driver",
                sourceId: driver.id,
                lastUpdate: Date.now(),
                sourceName: driver.full_name
            };
            //----------------------------------------------------------------


            await prisma.driverCoordinates.upsert({
                where: {id_driver: id_driver},
                update: {lat, long},
                create: {id_driver: id_driver, lat, long}
            });

            const room = `route_${driver.current_route_id}`;

            //Emit para os cadetes da rota

            io.to(room).emit("driver:location",{
                id_driver,
                lat,
                long,
                routeId: driver.current_route_id,
                driverName: driver.full_name
            });
        });











        /**
         * Cadete transmitindo localizacao
         */

        socket.on("cadete:updateLocation", async (data) =>{
            const {cadeteId, lat, long, sourceName} = data;

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

            const routeId = cadete?.stop?.route?.id;
            if (!routeId) {
                socket.emit("socket:error", {
                    event: "cadete:updateLocation",
                    message: `routeId: ${routeId} does not exist.`
                });
                return;
            }

            // Verifica se o motorista esta activo

            if (isDriveActive(routeId)) {
                socket.emit("socket:ignored", {
                    event: "cadete:updateLocation",
                    message: "Motorista está ativo nesta rota."
                });
                return;
            }

            routeLocationState[routeId] = {
                source: "cadete",
                sourceId: cadeteId,
                lastUpdate: Date.now(),
                sourceName: cadete.full_name
            };

            io.to(`route_${routeId}`).emit("transport:location",{
                cadeteId,
                lat,
                long,
                source: "cadete",
                routeId: cadete.stop?.route.id,
                cadeteName:cadete.full_name
            });

        });






















        //Desconectar socket
        socket.on("disconnect", (reason) =>{
            console.log("🔴 Socket disconnected: ", socket.id, " Motivo:", reason);
        });

    });
}