import { Chat, ChatFilters, ChatMessage, ChatType, SenderType } from "./Chat"

export interface ChatRepository {
  list(filters: ChatFilters): Promise<{ data: Chat[]; total: number }>
  getById(id: number): Promise<Chat | null>
  findGeneral(): Promise<Chat | null>
  findByRoute(routeId: number): Promise<Chat | null>
  create(data: { fullName?: string | null; type: ChatType; routeId?: number | null }): Promise<Chat>
  listMessages(
    chatId: number,
    page: number,
    limit: number,
  ): Promise<{ data: ChatMessage[]; total: number }>
  addMessage(data: {
    chatId: number
    senderId: number
    senderType: SenderType
    content: string
  }): Promise<ChatMessage>
  delete(id: number): Promise<void>
}
