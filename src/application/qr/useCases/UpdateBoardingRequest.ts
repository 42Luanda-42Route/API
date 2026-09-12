import { ApplicationError } from "../../errors/ApplicationError"
import { BoardingRequestRepository } from "../../../domain/boarding/BoardingRequestRepository"
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
      return await this.boardingRequests.updateStatus(input.requestId, input.driverId, input.status)
    } catch (error: any) {
      if (error?.statusCode === 404) {
        throw new ApplicationError("Pedido não encontrado", 404)
      }
      throw error
    }
  }
}
