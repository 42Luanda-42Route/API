import { ApplicationError } from "../../errors/ApplicationError"
import { BoardingRequestRepository } from "../../../domain/boarding/BoardingRequestRepository"
import { ListBoardingRequestsInput } from "../dto"

export class ListBoardingRequestsUseCase {
  constructor(private readonly boardingRequests: BoardingRequestRepository) {}

  async execute(input: ListBoardingRequestsInput) {
    if (input.role === "ADMIN") {
      throw new ApplicationError(
        "Administradores não usam GET /api/qr/boarding/requests (lista do motorista autenticado).",
        403,
        {
          code: "ADMIN_USE_TRIP_BOARDING_LIST",
          hint: "Use GET /api/trips/:tripId/boarding-requests ou GET /api/trips?status=ACTIVE.",
        },
      )
    }
    if (input.role !== "DRIVER") {
      throw new ApplicationError(
        "Apenas o motorista autenticado pode listar os próprios pedidos QR.",
        403,
        {
          code: "FORBIDDEN_ROLE",
          hint: "Cadetes usam GET /api/boarding-requests/mine.",
        },
      )
    }
    return this.boardingRequests.listForDriver(input.driverId, input.status)
  }
}
