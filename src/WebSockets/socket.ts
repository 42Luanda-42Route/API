import { Server } from "socket.io"
import { FastifyInstance } from "fastify"
import { PrismaClient } from "@prisma/client"
import { RouteLocationState } from "../modules/routes/route.interface";
import { ro } from "@faker-js/faker/.";

const prisma = new PrismaClient();

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
        }
    });


    io.on("connection", (socket) =>{
        console.log("🟢 Socket conectado: ", socket.id);


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

            if (!driver?.current_route_id) return "Driver is not assign to one route. Please assign one route first";



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
            if (!routeId) return `routeId: ${routeId} does not exists.`;

            // Verifica se o motorista esta activo

            if (isDriveActive(routeId)) return "Motorista está ativo nesta rota, Obrigado pela sua contribuição";

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
        socket.on("disconnect", () =>{
            console.log("🔴 Socket disconnected: ",socket.id);
        });

    });
}