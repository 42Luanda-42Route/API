// import { PrismaClient } from "@prisma/client";

// const prisma = new PrismaClient();

// export const chatService = {

//     async createGeneralChat(){
//         return prisma.chat.upsert({
//             where: { id: 1, type: "GENERAL" },
//             update:{},
//             create: {type: "GENERAL"}
//         });
//     },

//     async getRouteChat(routeId: number) {
//         return prisma.chat.upsert({
//         where: {
//             type_route_id: {
//                 type: "ROUTE",
//                 route_id: routeId
//             }
//         },
//         update: {},
//         create: {
//             type: "ROUTE",
//             route_id: routeId
//         }
//         });
//     },

//     async saveMessage(data:{
//         chatId: number;
//         senderId: number;
//         senderType: any;
//         content: string;
//     }){
//         return prisma.message.create({
//             data:{
//                 chat_id: data.chatId,
//                 sender_id: data.senderId,
//                 senderType: data.senderType,
//                 content: data.content
//             }
//         });
//     },

//     async listMessagesByChat(chatId: number){
//         return prisma.message.findMany({
//             where: {chat_id: chatId},
//             orderBy: {createdAt: "asc"}
//         });
//     }
// };