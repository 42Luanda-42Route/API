import { ApplicationError } from "../../errors/ApplicationError"
import { BoardingRequestRepository } from "../../../domain/boarding/BoardingRequestRepository"
import { emitBoardingToParties } from "../../../WebSockets/socket"
import { UpdateBoardingRequestInput } from "../dto"

export class UpdateBoardingRequestUseCase {
  constructor(private readonly boardingRequests: BoardingRequestRepository) {}

  async execute(input: UpdateBoardingRequestInput) {
    if (input.role !== "DRIVER") {
      throw new ApplicationError("Apenas motoristas podem decidir pedidos de embarque", 403)
    }
    if (!["APPROVED", "REJECTED"].includes(input.status)) {
      throw new ApplicationError("status must be APPROVED or REJECTED", 422)
    }
    try {
      const request = await this.boardingRequests.updateStatus(
        input.requestId,
        input.driverId,
        input.status,
      )
      emitBoardingToParties(
        { driverId: request.driverId, cadeteId: request.cadeteId, routeId: request.routeId },
        "boarding:request:updated",
        {
        id: request.id,
        cadeteId: request.cadeteId,
        driverId: request.driverId,
        routeId: request.routeId,
        status: request.status,
        flagged: request.flagged,
        createdAt: request.createdAt,
        updatedAt: request.updatedAt,
        cadeteName: request.cadeteName ?? null,
        stopName: request.stopName ?? null,
      })
      return request
    } catch (error: any) {
      if (error?.statusCode === 404) {
        throw new ApplicationError("Pedido não encontrado", 404)
      }
      throw error
    }
  }
}
