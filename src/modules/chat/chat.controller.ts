import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { chatService } from "./chat.service";
import { Param } from "@prisma/client/runtime/library";


export class ChatController{
    static async getGeneralChatMessages(req: FastifyRequest, reply: FastifyReply){
        
        const chat = await chatService.createGeneralChat();
        
        if (!chat) return reply.status(404).send({error: "Nenhum chat criado"});
        
        const messages = await chatService.listMessagesByChat(chat.id);
        reply.send(messages);
    }   

    static async getRouteChatMessages(req: FastifyRequest<{Params: {routeId: number}}>, reply: FastifyReply){
        const routeId = await Number(req.params.routeId);
        const chat = await chatService.getRouteChat(routeId);
        const messages = await chatService.listMessagesByChat(chat.id);
        reply.send(messages);
    }
}