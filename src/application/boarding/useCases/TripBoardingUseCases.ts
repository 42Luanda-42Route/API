import { BoardingRequestStatus } from "../../../domain/boarding/BoardingRequest"
import { BoardingRequestRepository } from "../../../domain/boarding/BoardingRequestRepository"
import { TripRepository } from "../../../domain/trips/TripRepository"
import { emitBoardingEvent } from "../../../WebSockets/socket"
import { ApplicationError } from "../../errors/ApplicationError"
import { TripActor } from "../../trips/useCases/TripUseCases"

function roleOf(actor: TripActor): string {
  return actor.role?.toUpperCase()
}

export class CreateTripBoardingRequestUseCase {
  constructor(private readonly requests: BoardingRequestRepository) {}

  async execute(actor: TripActor, tripId: number) {
    if (roleOf(actor) !== "CADETE") {
      throw new ApplicationError(
        `O perfil ${roleOf(actor) || "desconhecido"} não pode criar pedidos de embarque.`,
        403,
        {
          code: "FORBIDDEN_ROLE",
          hint: "Autentique-se como CADETE e use POST /api/trips/:tripId/boarding-requests.",
        },
      )
    }
    const request = await this.requests.createForTrip({ tripId, cadeteId: actor.id })
    emitBoardingEvent("boarding:request:created", request)
    return request
  }
}

export class ListMyBoardingRequestsUseCase {
  constructor(private readonly requests: BoardingRequestRepository) {}

  async execute(actor: TripActor, tripId?: number) {
    if (roleOf(actor) !== "CADETE") {
      throw new ApplicationError(
        `O perfil ${roleOf(actor) || "desconhecido"} não pode listar pedidos pessoais de embarque.`,
        403,
        {
          code: "FORBIDDEN_ROLE",
          hint: "Cadetes usam GET /api/boarding-requests/mine. Motoristas usam GET /api/trips/:tripId/boarding-requests.",
        },
      )
    }
    return this.requests.listMine(actor.id, tripId)
  }
}

export class ListTripBoardingRequestsUseCase {
  constructor(
    private readonly trips: TripRepository,
    private readonly requests: BoardingRequestRepository,
  ) {}

  async execute(actor: TripActor, tripId: number, status?: BoardingRequestStatus) {
    const trip = await this.trips.findById(tripId)
    if (!trip) {
      throw new ApplicationError(`Viagem #${tripId} não encontrada.`, 404, {
        code: "TRIP_NOT_FOUND",
        hint: "Liste viagens em GET /api/trips e confirme o tripId.",
      })
    }
    if (roleOf(actor) !== "ADMIN" && !(roleOf(actor) === "DRIVER" && trip.driverId === actor.id)) {
      throw new ApplicationError(
        `Não pode listar os pedidos da viagem #${tripId}. Só o motorista #${trip.driverId} ou um ADMIN podem.`,
        403,
        {
          code: "FORBIDDEN_RESOURCE",
          hint: "Cadetes consultam os próprios pedidos em GET /api/boarding-requests/mine.",
        },
      )
    }
    if (status && !["PENDING", "APPROVED", "REJECTED"].includes(status)) {
      throw new ApplicationError(`O status «${status}» é inválido.`, 422, {
        code: "INVALID_BOARDING_STATUS",
        hint: "Use PENDING, APPROVED ou REJECTED em GET /api/trips/:tripId/boarding-requests?status=.",
      })
    }
    return this.requests.listForTrip(tripId, status)
  }
}

export class DecideBoardingRequestUseCase {
  constructor(private readonly requests: BoardingRequestRepository) {}

  async execute(
    actor: TripActor,
    requestId: number,
    status: Exclude<BoardingRequestStatus, "PENDING">,
  ) {
    if (!["APPROVED", "REJECTED"].includes(status)) {
      throw new ApplicationError("status deve ser APPROVED ou REJECTED.", 422, {
        code: "INVALID_BOARDING_STATUS",
        hint: "Envie { \"status\": \"APPROVED\" } ou { \"status\": \"REJECTED\" } em PATCH /api/boarding-requests/:id.",
      })
    }
    const existing = await this.requests.findById(requestId)
    if (!existing) {
      throw new ApplicationError(`Pedido de embarque #${requestId} não encontrado.`, 404, {
        code: "BOARDING_NOT_FOUND",
        hint: "Liste pedidos em GET /api/trips/:tripId/boarding-requests ou GET /api/boarding-requests/mine.",
      })
    }
    if (roleOf(actor) !== "ADMIN" && !(roleOf(actor) === "DRIVER" && existing.driverId === actor.id)) {
      throw new ApplicationError(
        `O perfil ${roleOf(actor)} #${actor.id} não pode decidir o pedido #${requestId}, que pertence ao motorista #${existing.driverId}.`,
        403,
        {
          code: "FORBIDDEN_RESOURCE",
          hint: "Só o motorista dono do pedido ou um ADMIN podem usar PATCH /api/boarding-requests/:id.",
        },
      )
    }
    const request = await this.requests.decideForTrip(requestId, status)
    emitBoardingEvent("boarding:request:updated", request)
    return request
  }
}
