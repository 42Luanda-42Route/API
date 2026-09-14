export type BoardingRequestStatus = "PENDING" | "APPROVED" | "REJECTED"

export interface BoardingRequest {
  id: number
  cadeteId: number
  driverId: number
  routeId: number
  tripId: number | null
  status: BoardingRequestStatus
  flagged: boolean
  createdAt: Date
  updatedAt: Date
  cadeteName?: string | null
  stopName?: string | null
}
