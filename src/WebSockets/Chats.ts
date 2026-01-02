import { Server } from "socket.io";
import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { log } from "console";

const prisma = new PrismaClient();
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