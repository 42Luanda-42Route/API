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
      throw new ApplicationError("Apenas cadetes podem pedir embarque", 403)
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
      throw new ApplicationError("Apenas cadetes podem consultar os próprios pedidos", 403)
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
    if (!trip) throw new ApplicationError("Viagem não encontrada", 404)
    if (roleOf(actor) !== "ADMIN" && !(roleOf(actor) === "DRIVER" && trip.driverId === actor.id)) {
      throw new ApplicationError("Não pode consultar os pedidos desta viagem", 403)
    }
    if (status && !["PENDING", "APPROVED", "REJECTED"].includes(status)) {
      throw new ApplicationError("status inválido", 422)
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
      throw new ApplicationError("status deve ser APPROVED ou REJECTED", 422)
    }
    const existing = await this.requests.findById(requestId)
    if (!existing) throw new ApplicationError("Pedido não encontrado", 404)
    if (roleOf(actor) !== "ADMIN" && !(roleOf(actor) === "DRIVER" && existing.driverId === actor.id)) {
      throw new ApplicationError("Não pode decidir este pedido", 403)
    }
    const request = await this.requests.decideForTrip(requestId, status)
    emitBoardingEvent("boarding:request:updated", request)
    return request
  }
}
