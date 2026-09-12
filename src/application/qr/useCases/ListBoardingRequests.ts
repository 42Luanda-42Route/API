import { ApplicationError } from "../../errors/ApplicationError"
import { BoardingRequestRepository } from "../../../domain/boarding/BoardingRequestRepository"
import { ListBoardingRequestsInput } from "../dto"

export class ListBoardingRequestsUseCase {
  constructor(private readonly boardingRequests: BoardingRequestRepository) {}

  async execute(input: ListBoardingRequestsInput) {
    if (input.role !== "DRIVER") {
      throw new ApplicationError("Apenas motoristas podem listar pedidos de embarque", 403)
    }
    return this.boardingRequests.listForDriver(input.driverId, input.status)
  }
}
