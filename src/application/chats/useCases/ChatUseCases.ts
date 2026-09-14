import { CadeteRepository } from "../../../domain/cadetes/CadeteRepository"
import { Chat, ChatFilters, ChatType, SenderType } from "../../../domain/chats/Chat"
import { ChatRepository } from "../../../domain/chats/ChatRepository"
import { DriverRepository } from "../../../domain/drivers/DriverRepository"
import { RouteRepository } from "../../../domain/routes/RouteRepository"
import { ApplicationError } from "../../errors/ApplicationError"
import { TripActor } from "../../trips/useCases/TripUseCases"

function roleOf(actor: TripActor): SenderType | string {
  return actor.role?.toUpperCase()
}

async function actorRouteId(
  actor: TripActor,
  cadetes: CadeteRepository,
  drivers: DriverRepository,
): Promise<number | null> {
  const role = roleOf(actor)
  if (role === "DRIVER") {
    const driver = await drivers.getById(actor.id)
    return driver?.currentRouteId ?? null
  }
  if (role === "CADETE") {
    const info = await cadetes.getRouteInfo(actor.id)
    return info?.stop?.route?.id ?? null
  }
  return null
}

export class ListChatsUseCase {
  constructor(
    private readonly chats: ChatRepository,
    private readonly cadetes: CadeteRepository,
    private readonly drivers: DriverRepository,
  ) {}

  async execute(actor: TripActor, filters: ChatFilters) {
    if (!Number.isInteger(filters.page) || filters.page < 1) {
      throw new ApplicationError("page deve ser um inteiro positivo.", 422, {
        code: "INVALID_PAGE",
        hint: "Use GET /api/chats?page=1&limit=20.",
      })
    }
    if (!Number.isInteger(filters.limit) || filters.limit < 1 || filters.limit > 100) {
      throw new ApplicationError("limit deve estar entre 1 e 100.", 422, {
        code: "INVALID_LIMIT",
        hint: "Use um limit entre 1 e 100.",
      })
    }

    const role = roleOf(actor)
    if (role === "ADMIN") {
      const result = await this.chats.list(filters)
      return { ...result, page: filters.page, limit: filters.limit }
    }

    const routeId = await actorRouteId(actor, this.cadetes, this.drivers)
    const result = await this.chats.list({ ...filters, page: 1, limit: 100 })
    const visible = result.data.filter((chat) => chat.type === "GENERAL" || (routeId && chat.routeId === routeId))
    const start = (filters.page - 1) * filters.limit
    return {
      data: visible.slice(start, start + filters.limit),
      total: visible.length,
      page: filters.page,
      limit: filters.limit,
    }
  }
}

export class GetChatByIdUseCase {
  constructor(
    private readonly chats: ChatRepository,
    private readonly cadetes: CadeteRepository,
    private readonly drivers: DriverRepository,
  ) {}

  async execute(actor: TripActor, chatId: number): Promise<Chat> {
    const chat = await this.chats.getById(chatId)
    if (!chat) {
      throw new ApplicationError(`Chat #${chatId} não encontrado.`, 404, {
        code: "CHAT_NOT_FOUND",
        hint: "Liste chats em GET /api/chats e confirme o id.",
      })
    }
    await assertCanAccessChat(actor, chat, this.cadetes, this.drivers)
    return chat
  }
}

export class CreateChatUseCase {
  constructor(
    private readonly chats: ChatRepository,
    private readonly routes: RouteRepository,
  ) {}

  async execute(actor: TripActor, input: { type: ChatType; routeId?: number; fullName?: string }) {
    if (roleOf(actor) !== "ADMIN") {
      throw new ApplicationError(
        `O perfil ${roleOf(actor) || "desconhecido"} não pode criar chats.`,
        403,
        {
          code: "FORBIDDEN_ROLE",
          hint: "Apenas ADMIN pode usar POST /api/chats.",
        },
      )
    }
    if (!["GENERAL", "ROUTE"].includes(input.type)) {
      throw new ApplicationError(`O type «${input.type}» é inválido.`, 422, {
        code: "INVALID_CHAT_TYPE",
        hint: "Envie { \"type\": \"GENERAL\" } ou { \"type\": \"ROUTE\", \"route_id\": <id> }.",
      })
    }

    if (input.type === "GENERAL") {
      const existing = await this.chats.findGeneral()
      if (existing) {
        throw new ApplicationError(
          `Já existe o chat GENERAL (#${existing.id}). Não é possível criar outro.`,
          409,
          {
            code: "GENERAL_CHAT_EXISTS",
            hint: `Use GET /api/chats/${existing.id} e POST /api/chats/${existing.id}/messages.`,
          },
        )
      }
      return this.chats.create({
        type: "GENERAL",
        fullName: input.fullName?.trim() || "Geral",
        routeId: null,
      })
    }

    if (!input.routeId || !Number.isInteger(input.routeId) || input.routeId <= 0) {
      throw new ApplicationError("Um chat ROUTE exige route_id de uma rota existente.", 422, {
        code: "INVALID_ROUTE_ID",
        hint: "Envie { \"type\": \"ROUTE\", \"route_id\": <id> } com um id de GET /api/routes.",
      })
    }
    const route = await this.routes.getById(input.routeId)
    if (!route) {
      throw new ApplicationError(`A rota #${input.routeId} não existe. Não é possível criar o chat.`, 404, {
        code: "ROUTE_NOT_FOUND",
        hint: "Liste rotas em GET /api/routes e use um route_id válido.",
      })
    }
    const existing = await this.chats.findByRoute(input.routeId)
    if (existing) {
      throw new ApplicationError(
        `Já existe o chat da rota #${input.routeId} (chat #${existing.id}).`,
        409,
        {
          code: "ROUTE_CHAT_EXISTS",
          hint: `Use GET /api/chats/${existing.id} em vez de criar outro.`,
        },
      )
    }
    return this.chats.create({
      type: "ROUTE",
      routeId: input.routeId,
      fullName: input.fullName?.trim() || route.routeName,
    })
  }
}

export class ListChatMessagesUseCase {
  constructor(
    private readonly chats: ChatRepository,
    private readonly cadetes: CadeteRepository,
    private readonly drivers: DriverRepository,
  ) {}

  async execute(actor: TripActor, chatId: number, page: number, limit: number) {
    const chat = await this.chats.getById(chatId)
    if (!chat) {
      throw new ApplicationError(`Chat #${chatId} não encontrado.`, 404, {
        code: "CHAT_NOT_FOUND",
        hint: "Liste chats em GET /api/chats e confirme o id.",
      })
    }
    await assertCanAccessChat(actor, chat, this.cadetes, this.drivers)
    if (!Number.isInteger(page) || page < 1) {
      throw new ApplicationError("page deve ser um inteiro positivo.", 422, { code: "INVALID_PAGE" })
    }
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new ApplicationError("limit deve estar entre 1 e 100.", 422, { code: "INVALID_LIMIT" })
    }
    const result = await this.chats.listMessages(chatId, page, limit)
    return { ...result, page, limit }
  }
}

export class SendChatMessageUseCase {
  constructor(
    private readonly chats: ChatRepository,
    private readonly cadetes: CadeteRepository,
    private readonly drivers: DriverRepository,
  ) {}

  async execute(actor: TripActor, chatId: number, content: string) {
    const role = roleOf(actor)
    if (!["CADETE", "DRIVER", "ADMIN"].includes(String(role))) {
      throw new ApplicationError(
        `O perfil ${role || "desconhecido"} não pode enviar mensagens.`,
        403,
        {
          code: "FORBIDDEN_ROLE",
          hint: "Autentique-se como CADETE, DRIVER ou ADMIN.",
        },
      )
    }
    const text = content?.trim()
    if (!text) {
      throw new ApplicationError("O campo content é obrigatório e não pode estar vazio.", 422, {
        code: "MESSAGE_CONTENT_REQUIRED",
        hint: "Envie { \"content\": \"texto da mensagem\" } em POST /api/chats/:id/messages.",
      })
    }
    if (text.length > 2000) {
      throw new ApplicationError("A mensagem não pode ter mais de 2000 caracteres.", 422, {
        code: "MESSAGE_TOO_LONG",
        hint: "Reduza o content para no máximo 2000 caracteres.",
      })
    }
    const chat = await this.chats.getById(chatId)
    if (!chat) {
      throw new ApplicationError(`Chat #${chatId} não encontrado. Não é possível enviar a mensagem.`, 404, {
        code: "CHAT_NOT_FOUND",
        hint: "Liste chats em GET /api/chats e confirme o id.",
      })
    }
    await assertCanAccessChat(actor, chat, this.cadetes, this.drivers)
    return this.chats.addMessage({
      chatId,
      senderId: actor.id,
      senderType: role as SenderType,
      content: text,
    })
  }
}

export class DeleteChatUseCase {
  constructor(private readonly chats: ChatRepository) {}

  async execute(actor: TripActor, chatId: number) {
    if (roleOf(actor) !== "ADMIN") {
      throw new ApplicationError("Apenas administradores podem apagar chats.", 403, {
        code: "FORBIDDEN_ROLE",
        hint: "Use DELETE /api/chats/:id autenticado como ADMIN. As mensagens são apagadas em cascata.",
      })
    }
    const chat = await this.chats.getById(chatId)
    if (!chat) {
      throw new ApplicationError(`Chat #${chatId} não encontrado. Não é possível apagar.`, 404, {
        code: "CHAT_NOT_FOUND",
        hint: "Liste chats em GET /api/chats e confirme o id.",
      })
    }
    await this.chats.delete(chatId)
  }
}

async function assertCanAccessChat(
  actor: TripActor,
  chat: Chat,
  cadetes: CadeteRepository,
  drivers: DriverRepository,
) {
  const role = roleOf(actor)
  if (role === "ADMIN" || chat.type === "GENERAL") return
  const routeId = await actorRouteId(actor, cadetes, drivers)
  if (chat.type === "ROUTE" && routeId && chat.routeId === routeId) return
  throw new ApplicationError(
    `Não tem acesso ao chat #${chat.id} (type=${chat.type}, route_id=${chat.routeId ?? "nulo"}).`,
    403,
    {
      code: "FORBIDDEN_CHAT",
      hint:
        chat.type === "ROUTE"
          ? "Só quem está na mesma rota (paragem do cadete ou current_route_id do motorista) pode usar este chat."
          : "Use GET /api/chats para ver os chats permitidos ao seu perfil.",
    },
  )
}
