import { FastifyReply, FastifyRequest } from "fastify"
import {
  CreateChatUseCase,
  DeleteChatUseCase,
  GetChatByIdUseCase,
  ListChatMessagesUseCase,
  ListChatsUseCase,
  SendChatMessageUseCase,
} from "../../../application/chats/useCases/ChatUseCases"
import { ApplicationError } from "../../../application/errors/ApplicationError"
import { ChatType } from "../../../domain/chats/Chat"
import { JWTPayload } from "../../../utils/jwt"
import { TripActor } from "../../../application/trips/useCases/TripUseCases"

function actorFrom(req: FastifyRequest): TripActor {
  const user = req.user as JWTPayload
  return { id: Number(user.id), role: user.role }
}

function positiveId(value: unknown, name: string): number {
  const id = Number(value)
  if (!Number.isInteger(id) || id <= 0) {
    throw new ApplicationError(`O ${name} deve ser um inteiro positivo.`, 422, {
      code: "INVALID_ID",
      hint: `Use um ${name} numérico no URL.`,
    })
  }
  return id
}

export class ChatController {
  constructor(
    private readonly listChats: ListChatsUseCase,
    private readonly getChat: GetChatByIdUseCase,
    private readonly createChat: CreateChatUseCase,
    private readonly listMessages: ListChatMessagesUseCase,
    private readonly sendMessage: SendChatMessageUseCase,
    private readonly deleteChat: DeleteChatUseCase,
  ) {}

  async list(req: FastifyRequest, reply: FastifyReply) {
    try {
      const query = req.query as any
      return reply.send(
        await this.listChats.execute(actorFrom(req), {
          page: query.page !== undefined ? Number(query.page) : 1,
          limit: query.limit !== undefined ? Number(query.limit) : 20,
          type: query.type as ChatType | undefined,
          routeId: query.routeId !== undefined ? Number(query.routeId) : undefined,
        }),
      )
    } catch (error) {
      return this.handle(error, reply)
    }
  }

  async getById(req: FastifyRequest, reply: FastifyReply) {
    try {
      return reply.send(await this.getChat.execute(actorFrom(req), positiveId((req.params as any).id, "id do chat")))
    } catch (error) {
      return this.handle(error, reply)
    }
  }

  async create(req: FastifyRequest, reply: FastifyReply) {
    try {
      const body = req.body as any
      const result = await this.createChat.execute(actorFrom(req), {
        type: String(body?.type ?? "").toUpperCase() as ChatType,
        routeId: body?.route_id !== undefined ? Number(body.route_id) : undefined,
        fullName: body?.full_name,
      })
      return reply.code(201).send(result)
    } catch (error) {
      return this.handle(error, reply)
    }
  }

  async messages(req: FastifyRequest, reply: FastifyReply) {
    try {
      const query = req.query as any
      return reply.send(
        await this.listMessages.execute(
          actorFrom(req),
          positiveId((req.params as any).id, "id do chat"),
          query.page !== undefined ? Number(query.page) : 1,
          query.limit !== undefined ? Number(query.limit) : 20,
        ),
      )
    } catch (error) {
      return this.handle(error, reply)
    }
  }

  async send(req: FastifyRequest, reply: FastifyReply) {
    try {
      const body = req.body as any
      return reply.code(201).send(
        await this.sendMessage.execute(
          actorFrom(req),
          positiveId((req.params as any).id, "id do chat"),
          body?.content,
        ),
      )
    } catch (error) {
      return this.handle(error, reply)
    }
  }

  async delete(req: FastifyRequest, reply: FastifyReply) {
    try {
      await this.deleteChat.execute(actorFrom(req), positiveId((req.params as any).id, "id do chat"))
      return reply.status(204).send()
    } catch (error) {
      return this.handle(error, reply)
    }
  }

  private handle(error: unknown, reply: FastifyReply) {
    if (error instanceof ApplicationError) {
      return reply.status(error.statusCode).send(error.toPayload())
    }
    reply.log.error(error)
    return reply.status(500).send({ error: "Internal server error" })
  }
}
