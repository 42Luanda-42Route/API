export type ChatType = "GENERAL" | "ROUTE"
export type SenderType = "CADETE" | "DRIVER" | "ADMIN"

export interface ChatMessage {
  id: number
  chatId: number
  senderId: number
  senderType: SenderType
  content: string
  createdAt: Date
}

export interface Chat {
  id: number
  fullName: string | null
  type: ChatType
  routeId: number | null
  createdAt: Date
  lastMessage?: ChatMessage | null
}

export interface ChatFilters {
  page: number
  limit: number
  type?: ChatType
  routeId?: number
}
