import { FastifyInstance } from "fastify"
import {
  CreateChatUseCase,
  DeleteChatUseCase,
  GetChatByIdUseCase,
  ListChatMessagesUseCase,
  ListChatsUseCase,
  SendChatMessageUseCase,
} from "../../../application/chats/useCases/ChatUseCases"
import { CadetePrismaRepository } from "../../../infrastructure/repositories/CadetePrismaRepository"
import { ChatPrismaRepository } from "../../../infrastructure/repositories/ChatPrismaRepository"
import { DriverPrismaRepository } from "../../../infrastructure/repositories/DriverPrismaRepository"
import { RoutePrismaRepository } from "../../../infrastructure/repositories/RoutePrismaRepository"
import { ChatController } from "../controllers/ChatController"

const authSchema = { security: [{ bearerAuth: [] }] }
const idParams = {
  type: "object",
  required: ["id"],
  properties: { id: { type: "integer", minimum: 1 } },
}

export default async function chatRoutes(app: FastifyInstance) {
  const chats = new ChatPrismaRepository(app.prisma)
  const cadetes = new CadetePrismaRepository(app.prisma)
  const drivers = new DriverPrismaRepository(app.prisma)
  const routes = new RoutePrismaRepository(app.prisma)
  const controller = new ChatController(
    new ListChatsUseCase(chats, cadetes, drivers),
    new GetChatByIdUseCase(chats, cadetes, drivers),
    new CreateChatUseCase(chats, routes),
    new ListChatMessagesUseCase(chats, cadetes, drivers),
    new SendChatMessageUseCase(chats, cadetes, drivers),
    new DeleteChatUseCase(chats),
  )

  app.get(
    "/chats",
    {
      preHandler: [app.authenticate],
      schema: {
        ...authSchema,
        tags: ["Chats"],
        summary: "Listar chats visíveis ao perfil autenticado",
        description:
          "ADMIN vê todos. CADETE/DRIVER vêem o chat GENERAL e o chat ROUTE da própria rota. Sem rota, só o GENERAL.",
      },
    },
    (req, reply) => controller.list(req, reply),
  )

  app.post(
    "/chats",
    {
      preHandler: [app.authorizeRoles("ADMIN")],
      schema: {
        ...authSchema,
        tags: ["Chats"],
        summary: "Criar chat GENERAL ou ROUTE",
        description: "Só ADMIN. Existe no máximo um GENERAL e um ROUTE por rota.",
        body: {
          type: "object",
          required: ["type"],
          properties: {
            type: { type: "string", enum: ["GENERAL", "ROUTE"] },
            route_id: { type: "integer", minimum: 1 },
            full_name: { type: "string" },
          },
        },
      },
    },
    (req, reply) => controller.create(req, reply),
  )

  app.get(
    "/chats/:id",
    {
      preHandler: [app.authenticate],
      schema: { ...authSchema, tags: ["Chats"], summary: "Obter chat por ID", params: idParams },
    },
    (req, reply) => controller.getById(req, reply),
  )

  app.delete(
    "/chats/:id",
    {
      preHandler: [app.authorizeRoles("ADMIN")],
      schema: {
        ...authSchema,
        tags: ["Chats"],
        summary: "Apagar chat e as respetivas mensagens",
        params: idParams,
      },
    },
    (req, reply) => controller.delete(req, reply),
  )

  app.get(
    "/chats/:id/messages",
    {
      preHandler: [app.authenticate],
      schema: {
        ...authSchema,
        tags: ["Chats"],
        summary: "Listar mensagens de um chat",
        params: idParams,
      },
    },
    (req, reply) => controller.messages(req, reply),
  )

  app.post(
    "/chats/:id/messages",
    {
      preHandler: [app.authenticate],
      schema: {
        ...authSchema,
        tags: ["Chats"],
        summary: "Enviar mensagem para um chat",
        params: idParams,
        body: {
          type: "object",
          required: ["content"],
          properties: { content: { type: "string", minLength: 1, maxLength: 2000 } },
        },
      },
    },
    (req, reply) => controller.send(req, reply),
  )
}
