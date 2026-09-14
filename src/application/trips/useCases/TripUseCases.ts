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

  async execute(actor: TripActor): Promise<Trip> {
    const role = roleOf(actor)
    if (role === "DRIVER") {
      const trip = await this.trips.findActiveByDriver(actor.id)
      if (!trip) {
        throw new ApplicationError(
          `O motorista #${actor.id} não tem uma viagem ACTIVE.`,
          404,
          {
            code: "NO_ACTIVE_TRIP_FOR_DRIVER",
            hint: "Inicie uma viagem em POST /api/trips com vehicle_name, vehicle_plate e vehicle_capacity.",
          },
        )
      }
      return trip
    }
    if (role === "CADETE") {
      const routeInfo = await this.cadetes.getRouteInfo(actor.id)
      if (!routeInfo) {
        throw new ApplicationError(`Cadete #${actor.id} não encontrado.`, 404, {
          code: "CADETE_NOT_FOUND",
          hint: "Confirme que o JWT usa o id da tabela Cadetes, não o id da Intra 42.",
        })
      }
      const routeId = routeInfo.stop?.route?.id
      if (!routeId) {
        throw new ApplicationError(
          `O cadete #${actor.id} não tem paragem/rota associada, por isso não há viagem ativa.`,
          404,
          {
            code: "CADETE_WITHOUT_ROUTE",
            hint: "Atualize a paragem em PUT /api/cadetes/:id com { \"stop_id\": <id> }.",
          },
        )
      }
      const trip = await this.trips.findActiveByRoute(routeId)
      if (!trip) {
        throw new ApplicationError(
          `Não existe uma viagem ACTIVE na rota #${routeId} do cadete.`,
          404,
          {
            code: "NO_ACTIVE_TRIP_ON_ROUTE",
            hint: "Aguarde o motorista da rota iniciar a viagem (POST /api/trips).",
          },
        )
      }
      const requests = await this.boardingRequests.listMine(actor.id, trip.id)
      return {
        ...withoutRequests(trip),
        myRequest: requests[0] ?? null,
      }
    }
    if (role === "ADMIN") {
      throw new ApplicationError(
        "Administradores não têm uma viagem ativa própria.",
        404,
        {
          code: "ADMIN_HAS_NO_ACTIVE_TRIP",
          hint: "Use GET /api/trips?status=ACTIVE para listar as viagens ativas de todos os motoristas.",
        },
      )
    }
    throw new ApplicationError(
      `O perfil ${role || "desconhecido"} não pode consultar a viagem ativa.`,
      403,
      {
        code: "FORBIDDEN_ROLE",
        hint: "Inicie sessão como DRIVER ou CADETE para GET /api/trips/active.",
      },
    )
  }
}

export class ListTripsUseCase {
  constructor(private readonly trips: TripRepository) {}

  async execute(actor: TripActor, filters: TripFilters) {
    const role = roleOf(actor)
    if (!["ADMIN", "DRIVER"].includes(role)) {
      throw new ApplicationError(
        "Cadetes não podem listar todas as viagens. Só consultam a viagem ativa da própria rota.",
        403,
        {
          code: "CADETE_CANNOT_LIST_TRIPS",
          hint: "Use GET /api/trips/active ou GET /api/trips/:id da viagem da sua rota.",
        },
      )
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
    if (roleOf(actor) !== "ADMIN") {
      throw new ApplicationError(
        "Apenas administradores podem editar os dados da viatura (PATCH /api/trips/:id).",
        403,
        {
          code: "DRIVER_CANNOT_PATCH_TRIP",
          hint: "O motorista controla o ciclo com POST /api/trips (criar) e POST /api/trips/:id/complete (terminar).",
        },
      )
    }
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

export class DeleteTripUseCase {
  constructor(private readonly trips: TripRepository) {}

  async execute(actor: TripActor, tripId: number): Promise<void> {
    if (roleOf(actor) !== "ADMIN") {
      throw new ApplicationError(
        "Apenas administradores podem apagar viagens já encerradas.",
        403,
        {
          code: "FORBIDDEN_ROLE",
          hint: "Motoristas devem usar POST /api/trips/:id/complete. Para remover o histórico, peça a um admin DELETE /api/trips/:id.",
        },
      )
    }
    await this.trips.delete(tripId)
  }
}

export function parseTripStatus(value?: string): TripStatus | undefined {
  return value ? (value.toUpperCase() as TripStatus) : undefined
}
