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
  /** Driver scanned cadete: approve existing pending or create APPROVED row */
  admitNow(input: {
    cadeteId: number
    driverId: number
    routeId: number
  }): Promise<BoardingRequest>
  createForTrip(input: { tripId: number; cadeteId: number }): Promise<BoardingRequest>
  listMine(cadeteId: number, tripId?: number): Promise<BoardingRequest[]>
  listForTrip(tripId: number, status?: BoardingRequestStatus): Promise<BoardingRequest[]>
  findById(id: number): Promise<BoardingRequest | null>
  decideForTrip(id: number, status: Exclude<BoardingRequestStatus, "PENDING">): Promise<BoardingRequest>
}
