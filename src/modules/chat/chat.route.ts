import { FastifyInstance } from "fastify";
import {ChatController} from "./chat.controller";

export default async function chatRoutes(app: FastifyInstance){
    
    app.get("/chats/general/messages", ChatController.getGeneralChatMessages);
    app.get("/chats/route/messages/:routeId", ChatController.getRouteChatMessages);
}

