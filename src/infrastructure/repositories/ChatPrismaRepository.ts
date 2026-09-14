import { PrismaClient } from "@prisma/client"
import { Chat, ChatFilters, ChatMessage, ChatType, SenderType } from "../../domain/chats/Chat"
import { ChatRepository } from "../../domain/chats/ChatRepository"
import { handlePrismaError } from "../errors/PrismaErrorHandler"

export class ChatPrismaRepository implements ChatRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(filters: ChatFilters): Promise<{ data: Chat[]; total: number }> {
    const where = {
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.routeId !== undefined ? { route_id: filters.routeId } : {}),
    }
    const [rows, total] = await Promise.all([
      this.prisma.chat.findMany({
        where,
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
        orderBy: { createdAt: "desc" },
        include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
      }),
      this.prisma.chat.count({ where }),
    ])
    return { data: rows.map((row) => this.mapChat(row)), total }
  }

  async getById(id: number): Promise<Chat | null> {
    const row = await this.prisma.chat.findUnique({
      where: { id },
      include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
    })
    return row ? this.mapChat(row) : null
  }

  async findGeneral(): Promise<Chat | null> {
    const row = await this.prisma.chat.findFirst({
      where: { type: "GENERAL" },
      include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
    })
    return row ? this.mapChat(row) : null
  }

  async findByRoute(routeId: number): Promise<Chat | null> {
    const row = await this.prisma.chat.findFirst({
      where: { type: "ROUTE", route_id: routeId },
      include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
    })
    return row ? this.mapChat(row) : null
  }

  async create(data: { fullName?: string | null; type: ChatType; routeId?: number | null }): Promise<Chat> {
    try {
      const row = await this.prisma.chat.create({
        data: {
          full_name: data.fullName ?? null,
          type: data.type,
          route_id: data.type === "ROUTE" ? data.routeId ?? null : null,
        },
      })
      return this.mapChat(row)
    } catch (error) {
      handlePrismaError(error)
    }
  }

  async listMessages(
    chatId: number,
    page: number,
    limit: number,
  ): Promise<{ data: ChatMessage[]; total: number }> {
    const where = { chat_id: chatId }
    const [rows, total] = await Promise.all([
      this.prisma.message.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.message.count({ where }),
    ])
    return { data: rows.map((row) => this.mapMessage(row)), total }
  }

  async addMessage(data: {
    chatId: number
    senderId: number
    senderType: SenderType
    content: string
  }): Promise<ChatMessage> {
    try {
      const row = await this.prisma.message.create({
        data: {
          chat_id: data.chatId,
          sender_id: data.senderId,
          senderType: data.senderType,
          content: data.content,
        },
      })
      return this.mapMessage(row)
    } catch (error) {
      handlePrismaError(error)
    }
  }

  async delete(id: number): Promise<void> {
    try {
      await this.prisma.chat.delete({ where: { id } })
    } catch (error) {
      handlePrismaError(error)
    }
  }

  private mapChat(row: any): Chat {
    const last = Array.isArray(row.messages) ? row.messages[0] : undefined
    return {
      id: row.id,
      fullName: row.full_name ?? null,
      type: row.type,
      routeId: row.route_id ?? null,
      createdAt: row.createdAt,
      lastMessage: last ? this.mapMessage(last) : null,
    }
  }

  private mapMessage(row: any): ChatMessage {
    return {
      id: row.id,
      chatId: row.chat_id,
      senderId: row.sender_id,
      senderType: row.senderType,
      content: row.content,
      createdAt: row.createdAt,
    }
  }
}
