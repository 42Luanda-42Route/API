import { ApplicationError } from "../../errors/ApplicationError"
import { BoardingRequestRepository } from "../../../domain/boarding/BoardingRequestRepository"
import { emitBoardingEvent } from "../../../WebSockets/socket"
import { UpdateBoardingRequestInput } from "../dto"

export class UpdateBoardingRequestUseCase {
  constructor(private readonly boardingRequests: BoardingRequestRepository) {}

  async execute(input: UpdateBoardingRequestInput) {
    if (!["DRIVER", "ADMIN"].includes(input.role)) {
      throw new ApplicationError(
        "Apenas motoristas (dono do pedido) ou administradores podem decidir pedidos de embarque.",
        403,
        {
          code: "FORBIDDEN_ROLE",
          hint: "Use PATCH /api/qr/boarding/requests/:id ou PATCH /api/boarding-requests/:id autenticado como DRIVER/ADMIN.",
        },
      )
    }
    if (!["APPROVED", "REJECTED"].includes(input.status)) {
      throw new ApplicationError("status deve ser APPROVED ou REJECTED.", 422, {
        code: "INVALID_BOARDING_STATUS",
        hint: "Envie { \"status\": \"APPROVED\" } ou { \"status\": \"REJECTED\" }.",
      })
    }
    const existing = await this.boardingRequests.findById(input.requestId)
    if (!existing) {
      throw new ApplicationError(`Pedido de embarque #${input.requestId} não encontrado.`, 404, {
        code: "BOARDING_NOT_FOUND",
        hint: "Liste pedidos em GET /api/qr/boarding/requests ou GET /api/trips/:tripId/boarding-requests.",
      })
    }
    if (input.role === "DRIVER" && existing.driverId !== input.driverId) {
      throw new ApplicationError(
        `O motorista #${input.driverId} não pode decidir o pedido #${input.requestId}, que pertence ao motorista #${existing.driverId}.`,
        403,
        {
          code: "FORBIDDEN_RESOURCE",
          hint: "Só o motorista dono do pedido ou um ADMIN podem decidir.",
        },
      )
    }
    const request = await this.boardingRequests.decideForTrip(input.requestId, input.status)
    emitBoardingEvent("boarding:request:updated", request)
    return request
  }
}