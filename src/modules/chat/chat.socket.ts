import { Server } from "socket.io";
import { chatService } from "./chat.service";
import { PrismaClient } from "@prisma/client";


const prisma = new PrismaClient();

export function registerChatSocket(io: Server){
    io.on("connection", (socket) =>{
        console.log("Connect to chat Socket");
        
        socket.on("join:chat", ({type, routeId}) =>{
            if (type === "GENERAL") socket.join("chat_general");
            if (type === "ROUTE") socket.join(`chat_route_${routeId}`);
        });

        socket.on("chat:send", async (payload) =>{
            const {
                chatId,
                content,
                senderId,
                senderType,
                routeId,
                chatType
            } = payload;

            const message = await chatService.saveMessage({chatId, senderId, senderType, content});

            const room = 
                chatType === "GENERAL" ? "chat_general" : `chat_route_${routeId}`
            
            io.to(room).emit("chat:new-message", message);

        });
    });
}