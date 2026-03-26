import { Server } from "socket.io";
import { FastifyInstance } from "fastify";
import prisma from "../infrastructure/database/prismaClient";
import { log } from "console";

/*
export function initChat(app: FastifyInstance){
    const io = new Server(app.server,{
        cors:{
            origin: "*"
        }
    });

    io.on("connection", (socket)=>{
        console.log("🟢 conectado ao Chat Server: ", socket.id);
        
        socket.on("chat:send", async (payload) =>{
            const {
                chatId,
                content,
                senderId,
                SenderType,
                routeId,
                chatType

            } = payload;
        });

        const message = await prisma.message.create({
            data: {
                cha
            }
        });

    });
    
}
    */