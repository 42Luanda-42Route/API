import { BoardingRequest, BoardingRequestStatus } from "./BoardingRequest"

export interface BoardingRequestRepository {
  createPending(input: {
    cadeteId: number
    driverId: number
    routeId: number
  }): Promise<BoardingRequest>
  findPending(cadeteId: number, driverId: number, routeId: number): Promise<BoardingRequest | null>
  listForDriver(driverId: number, status?: BoardingRequestStatus): Promise<BoardingRequest[]>
  updateStatus(id: number, driverId: number, status: BoardingRequestStatus): Promise<BoardingRequest>
}
