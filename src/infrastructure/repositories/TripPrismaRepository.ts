import {
  BoardingRequestStatus as PrismaBoardingStatus,
  PrismaClient,
  TripStatus as PrismaTripStatus,
} from "@prisma/client"
import { ApplicationError } from "../../application/errors/ApplicationError"
import { BoardingRequest } from "../../domain/boarding/BoardingRequest"
import { CreateTripData, Trip, TripFilters, TripStatus } from "../../domain/trips/Trip"
import { TripRepository } from "../../domain/trips/TripRepository"

const tripInclude = {
  route: { select: { id: true, route_name: true, description: true } },
  driver: {
    select: {
      id: true,
      full_name: true,
      username: true,
      phone: true,
      photo: true,
    },
  },
  boardingRequests: {
    include: {
      cadete: {
        select: {
          full_name: true,
          stop: { select: { stop_name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" as const },
  },
}

export class TripPrismaRepository implements TripRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createActive(data: CreateTripData): Promise<Trip> {
    const conflict = await this.prisma.trip.findFirst({
      where: {
        status: PrismaTripStatus.ACTIVE,
        OR: [{ route_id: data.routeId }, { driver_id: data.driverId }],
      },
      select: { route_id: true, driver_id: true },
    })
    if (conflict?.driver_id === data.driverId) {
      throw new ApplicationError("O motorista já possui uma viagem ativa", 409)
    }
    if (conflict) {
      throw new ApplicationError("A rota já possui uma viagem ativa", 409)
    }

    try {
      const row = await this.prisma.trip.create({
        data: {
          route_id: data.routeId,
          driver_id: data.driverId,
          vehicle_name: data.vehicleName,
          vehicle_plate: data.vehiclePlate,
          vehicle_capacity: data.vehicleCapacity,
        },
        include: tripInclude,
      })
      return this.map(row)
    } catch (error: any) {
      if (error?.code === "P2002") {
        throw new ApplicationError("A rota ou o motorista já possui uma viagem ativa", 409)
      }
      if (error?.code === "P2003") {
        throw new ApplicationError("Rota ou motorista não encontrado", 409)
      }
      throw error
    }
  }

  async findActiveByDriver(driverId: number): Promise<Trip | null> {
    const row = await this.prisma.trip.findFirst({
      where: { driver_id: driverId, status: PrismaTripStatus.ACTIVE },
      include: tripInclude,
    })
    return row ? this.map(row) : null
  }

  async findActiveByRoute(routeId: number): Promise<Trip | null> {
    const row = await this.prisma.trip.findFirst({
      where: { route_id: routeId, status: PrismaTripStatus.ACTIVE },
      include: tripInclude,
    })
    return row ? this.map(row) : null
  }

  async findById(id: number): Promise<Trip | null> {
    const row = await this.prisma.trip.findUnique({
      where: { id },
      include: tripInclude,
    })
    return row ? this.map(row) : null
  }

  async list(filters: TripFilters): Promise<{ data: Trip[]; total: number }> {
    const where: any = {
      ...(filters.status ? { status: filters.status as PrismaTripStatus } : {}),
      ...(filters.routeId ? { route_id: filters.routeId } : {}),
      ...(filters.driverId ? { driver_id: filters.driverId } : {}),
      ...(filters.dateFrom || filters.dateTo
        ? {
            startedAt: {
              ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
              ...(filters.dateTo ? { lte: filters.dateTo } : {}),
            },
          }
        : {}),
    }
    const [rows, total] = await Promise.all([
      this.prisma.trip.findMany({
        where,
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
        include: tripInclude,
        orderBy: { startedAt: "desc" },
      }),
      this.prisma.trip.count({ where }),
    ])
    return { data: rows.map((row) => this.map(row)), total }
  }

  async updateVehicle(
    id: number,
    data: { vehicleName?: string; vehiclePlate?: string; vehicleCapacity?: number },
  ): Promise<Trip> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.trip.findUnique({ where: { id } })
      if (!existing) throw new ApplicationError("Viagem não encontrada", 404)

      if (data.vehicleCapacity !== undefined) {
        const occupancy = await tx.boardingRequest.count({
          where: { trip_id: id, status: PrismaBoardingStatus.APPROVED },
        })
        if (data.vehicleCapacity < occupancy) {
          throw new ApplicationError("A capacidade não pode ser inferior à ocupação aprovada", 409)
        }
      }

      const row = await tx.trip.update({
        where: { id },
        data: {
          ...(data.vehicleName !== undefined ? { vehicle_name: data.vehicleName } : {}),
          ...(data.vehiclePlate !== undefined ? { vehicle_plate: data.vehiclePlate } : {}),
          ...(data.vehicleCapacity !== undefined ? { vehicle_capacity: data.vehicleCapacity } : {}),
        },
        include: tripInclude,
      })
      return this.map(row)
    })
  }

  async transition(id: number, status: Exclude<TripStatus, "ACTIVE">): Promise<Trip> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.trip.findUnique({ where: { id } })
      if (!existing) throw new ApplicationError("Viagem não encontrada", 404)
      if (existing.status === status) {
        const row = await tx.trip.findUnique({ where: { id }, include: tripInclude })
        return this.map(row!)
      }
      if (existing.status !== PrismaTripStatus.ACTIVE) {
        throw new ApplicationError("A viagem já foi encerrada", 409)
      }

      await tx.boardingRequest.updateMany({
        where: { trip_id: id, status: PrismaBoardingStatus.PENDING },
        data: { status: PrismaBoardingStatus.REJECTED, flagged: false },
      })
      const row = await tx.trip.update({
        where: { id },
        data: { status: status as PrismaTripStatus, endedAt: new Date() },
        include: tripInclude,
      })
      return this.map(row)
    })
  }

  async delete(id: number): Promise<void> {
    const existing = await this.prisma.trip.findUnique({ where: { id } })
    if (!existing) {
      throw new ApplicationError(`Viagem #${id} não encontrada. Não é possível apagar.`, 404, {
        code: "TRIP_NOT_FOUND",
        hint: "Liste viagens em GET /api/trips e confirme o id.",
      })
    }
    if (existing.status === PrismaTripStatus.ACTIVE) {
      throw new ApplicationError(
        `Não é possível apagar a viagem #${id} enquanto estiver ACTIVE.`,
        409,
        {
          code: "TRIP_STILL_ACTIVE",
          hint: "Conclua com POST /api/trips/:id/complete (motorista dono ou admin) ou cancele com POST /api/trips/:id/cancel (admin).",
        },
      )
    }
    await this.prisma.trip.delete({ where: { id } })
  }

  private map(row: any): Trip {
    const requests = (row.boardingRequests || []).map((request: any) => this.mapBoarding(request))
    const counts = {
      total: requests.length,
      pending: requests.filter((request: BoardingRequest) => request.status === "PENDING").length,
      approved: requests.filter((request: BoardingRequest) => request.status === "APPROVED").length,
      rejected: requests.filter((request: BoardingRequest) => request.status === "REJECTED").length,
    }
    return {
      id: row.id,
      routeId: row.route_id,
      driverId: row.driver_id,
      vehicleName: row.vehicle_name,
      vehiclePlate: row.vehicle_plate,
      vehicleCapacity: row.vehicle_capacity,
      status: row.status,
      startedAt: row.startedAt,
      endedAt: row.endedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      route: row.route
        ? { id: row.route.id, routeName: row.route.route_name, description: row.route.description }
        : undefined,
      driver: row.driver
        ? {
            id: row.driver.id,
            fullName: row.driver.full_name,
            username: row.driver.username,
            phone: row.driver.phone,
            photo: row.driver.photo,
          }
        : undefined,
      counts,
      stats: {
        ...counts,
        availableSeats: Math.max(0, row.vehicle_capacity - counts.approved),
      },
      occupancy: counts.approved,
      availableSeats: Math.max(0, row.vehicle_capacity - counts.approved),
      boardingRequests: requests,
    }
  }

  private mapBoarding(row: any): BoardingRequest {
    return {
      id: row.id,
      cadeteId: row.cadete_id,
      driverId: row.driver_id,
      routeId: row.route_id,
      tripId: row.trip_id ?? null,
      status: row.status,
      flagged: row.flagged,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      cadeteName: row.cadete?.full_name ?? null,
      stopName: row.cadete?.stop?.stop_name ?? null,
    }
  }
}
