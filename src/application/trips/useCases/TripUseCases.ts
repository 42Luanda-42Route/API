import { CadeteRepository } from "../../../domain/cadetes/CadeteRepository"
import { BoardingRequestRepository } from "../../../domain/boarding/BoardingRequestRepository"
import { DriverRepository } from "../../../domain/drivers/DriverRepository"
import { Trip, TripFilters, TripStatus } from "../../../domain/trips/Trip"
import { TripRepository } from "../../../domain/trips/TripRepository"
import { emitTripEvent } from "../../../WebSockets/socket"
import { ApplicationError } from "../../errors/ApplicationError"

export interface TripActor {
  id: number
  role: string
}

function roleOf(actor: TripActor): string {
  return actor.role?.toUpperCase()
}

function withoutRequests(trip: Trip): Trip {
  const { boardingRequests: _boardingRequests, ...safeTrip } = trip
  return safeTrip
}

function validateVehicle(
  input: { vehicleName?: string; vehiclePlate?: string; vehicleCapacity?: number },
  allRequired: boolean,
) {
  if (allRequired && (!input.vehicleName || !input.vehiclePlate || input.vehicleCapacity === undefined)) {
    throw new ApplicationError("vehicleName, vehiclePlate e vehicleCapacity são obrigatórios", 422)
  }
  if (input.vehicleName !== undefined && input.vehicleName.trim().length < 2) {
    throw new ApplicationError("vehicleName deve ter pelo menos 2 caracteres", 422)
  }
  if (input.vehiclePlate !== undefined && input.vehiclePlate.trim().length < 2) {
    throw new ApplicationError("vehiclePlate deve ter pelo menos 2 caracteres", 422)
  }
  if (
    input.vehicleCapacity !== undefined &&
    (!Number.isInteger(input.vehicleCapacity) || input.vehicleCapacity <= 0)
  ) {
    throw new ApplicationError("vehicleCapacity deve ser um inteiro positivo", 422)
  }
}

export class CreateTripUseCase {
  constructor(
    private readonly drivers: DriverRepository,
    private readonly trips: TripRepository,
  ) {}

  async execute(
    actor: TripActor,
    input: { vehicleName: string; vehiclePlate: string; vehicleCapacity: number },
  ): Promise<Trip> {
    if (roleOf(actor) !== "DRIVER") {
      throw new ApplicationError("Apenas motoristas podem iniciar viagens", 403)
    }
    validateVehicle(input, true)
    const driver = await this.drivers.getById(actor.id)
    if (!driver) throw new ApplicationError("Motorista não encontrado", 404)
    if (!driver.currentRouteId) {
      throw new ApplicationError("O motorista não possui uma rota atual", 409)
    }
    const trip = await this.trips.createActive({
      routeId: driver.currentRouteId,
      driverId: actor.id,
      vehicleName: input.vehicleName.trim(),
      vehiclePlate: input.vehiclePlate.trim().toUpperCase(),
      vehicleCapacity: input.vehicleCapacity,
    })
    emitTripEvent("trip:created", trip)
    return trip
  }
}

export class GetActiveTripUseCase {
  constructor(
    private readonly cadetes: CadeteRepository,
    private readonly trips: TripRepository,
    private readonly boardingRequests: BoardingRequestRepository,
  ) {}

  async execute(actor: TripActor): Promise<Trip | null> {
    const role = roleOf(actor)
    if (role === "DRIVER") {
      const trip = await this.trips.findActiveByDriver(actor.id)
      return trip
    }
    if (role === "CADETE") {
      const routeInfo = await this.cadetes.getRouteInfo(actor.id)
      if (!routeInfo) throw new ApplicationError("Cadete não encontrado", 404)
      const routeId = routeInfo.stop?.route?.id
      if (!routeId) return null
      const trip = await this.trips.findActiveByRoute(routeId)
      if (!trip) return null
      const requests = await this.boardingRequests.listMine(actor.id, trip.id)
      return {
        ...withoutRequests(trip),
        myRequest: requests[0] ?? null,
      }
    }
    if (role === "ADMIN") return null
    throw new ApplicationError("Perfil sem permissão", 403)
  }
}

export class ListTripsUseCase {
  constructor(private readonly trips: TripRepository) {}

  async execute(actor: TripActor, filters: TripFilters) {
    const role = roleOf(actor)
    if (!["ADMIN", "DRIVER"].includes(role)) {
      throw new ApplicationError("Perfil sem permissão para listar viagens", 403)
    }
    if (!Number.isInteger(filters.page) || filters.page < 1) {
      throw new ApplicationError("page deve ser um inteiro positivo", 422)
    }
    if (!Number.isInteger(filters.limit) || filters.limit < 1 || filters.limit > 100) {
      throw new ApplicationError("limit deve estar entre 1 e 100", 422)
    }
    if (filters.status && !["ACTIVE", "COMPLETED", "CANCELLED"].includes(filters.status)) {
      throw new ApplicationError("status inválido", 422)
    }
    const effectiveFilters = {
      ...filters,
      ...(role === "DRIVER" ? { driverId: actor.id } : {}),
    }
    const result = await this.trips.list(effectiveFilters)
    return {
      ...result,
      data: result.data.map(withoutRequests),
      page: filters.page,
      limit: filters.limit,
    }
  }
}

export class GetTripByIdUseCase {
  constructor(
    private readonly cadetes: CadeteRepository,
    private readonly trips: TripRepository,
  ) {}

  async execute(actor: TripActor, tripId: number): Promise<Trip> {
    const trip = await this.trips.findById(tripId)
    if (!trip) throw new ApplicationError("Viagem não encontrada", 404)
    const role = roleOf(actor)
    if (role === "ADMIN") return trip
    if (role === "DRIVER" && trip.driverId === actor.id) return trip
    if (role === "CADETE") {
      const routeInfo = await this.cadetes.getRouteInfo(actor.id)
      if (routeInfo?.stop?.route?.id === trip.routeId) return withoutRequests(trip)
    }
    throw new ApplicationError("Não pode consultar esta viagem", 403)
  }
}

export class UpdateTripUseCase {
  constructor(private readonly trips: TripRepository) {}

  async execute(
    actor: TripActor,
    tripId: number,
    input: { vehicleName?: string; vehiclePlate?: string; vehicleCapacity?: number },
  ): Promise<Trip> {
    if (roleOf(actor) !== "ADMIN") throw new ApplicationError("Apenas administradores podem editar viagens", 403)
    if (Object.values(input).every((value) => value === undefined)) {
      throw new ApplicationError("Informe ao menos um campo para atualizar", 422)
    }
    validateVehicle(input, false)
    const trip = await this.trips.updateVehicle(tripId, {
      ...(input.vehicleName !== undefined ? { vehicleName: input.vehicleName.trim() } : {}),
      ...(input.vehiclePlate !== undefined ? { vehiclePlate: input.vehiclePlate.trim().toUpperCase() } : {}),
      ...(input.vehicleCapacity !== undefined ? { vehicleCapacity: input.vehicleCapacity } : {}),
    })
    emitTripEvent("trip:updated", trip)
    return trip
  }
}

export class CompleteTripUseCase {
  constructor(private readonly trips: TripRepository) {}

  async execute(actor: TripActor, tripId: number): Promise<Trip> {
    const existing = await this.trips.findById(tripId)
    if (!existing) throw new ApplicationError("Viagem não encontrada", 404)
    if (roleOf(actor) !== "ADMIN" && !(roleOf(actor) === "DRIVER" && existing.driverId === actor.id)) {
      throw new ApplicationError("Não pode concluir esta viagem", 403)
    }
    const trip = await this.trips.transition(tripId, "COMPLETED")
    emitTripEvent("trip:updated", trip)
    return trip
  }
}

export class CancelTripUseCase {
  constructor(private readonly trips: TripRepository) {}

  async execute(actor: TripActor, tripId: number): Promise<Trip> {
    if (roleOf(actor) !== "ADMIN") throw new ApplicationError("Apenas administradores podem cancelar viagens", 403)
    const trip = await this.trips.transition(tripId, "CANCELLED")
    emitTripEvent("trip:updated", trip)
    return trip
  }
}

export function parseTripStatus(value?: string): TripStatus | undefined {
  return value ? (value.toUpperCase() as TripStatus) : undefined
}
