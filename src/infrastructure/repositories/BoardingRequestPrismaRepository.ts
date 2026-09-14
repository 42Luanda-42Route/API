import {
  Prisma,
  PrismaClient,
  BoardingRequestStatus as PrismaStatus,
  TripStatus as PrismaTripStatus,
} from "@prisma/client"
import { BoardingRequestRepository } from "../../domain/boarding/BoardingRequestRepository"
import { BoardingRequest, BoardingRequestStatus } from "../../domain/boarding/BoardingRequest"
import { ApplicationError } from "../../application/errors/ApplicationError"

export class BoardingRequestPrismaRepository implements BoardingRequestRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createPending(input: {
    cadeteId: number
    driverId: number
    routeId: number
  }): Promise<BoardingRequest> {
    const row = await this.prisma.boardingRequest.create({
      data: {
        cadete_id: input.cadeteId,
        driver_id: input.driverId,
        route_id: input.routeId,
        status: PrismaStatus.PENDING,
        flagged: true,
      },
      include: {
        cadete: { select: { full_name: true, stop: { select: { stop_name: true } } } },
      },
    })
    return this.map(row)
  }

  async findPending(cadeteId: number, driverId: number, routeId: number): Promise<BoardingRequest | null> {
    const row = await this.prisma.boardingRequest.findFirst({
      where: {
        cadete_id: cadeteId,
        driver_id: driverId,
        route_id: routeId,
        status: PrismaStatus.PENDING,
      },
      include: {
        cadete: { select: { full_name: true, stop: { select: { stop_name: true } } } },
      },
      orderBy: { createdAt: "desc" },
    })
    return row ? this.map(row) : null
  }

  async listForDriver(driverId: number, status?: BoardingRequestStatus): Promise<BoardingRequest[]> {
    const rows = await this.prisma.boardingRequest.findMany({
      where: {
        driver_id: driverId,
        ...(status ? { status: status as PrismaStatus } : {}),
      },
      include: {
        cadete: { select: { full_name: true, stop: { select: { stop_name: true } } } },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 50,
    })
    return rows.map((r) => this.map(r))
  }

  async updateStatus(id: number, driverId: number, status: BoardingRequestStatus): Promise<BoardingRequest> {
    const existing = await this.prisma.boardingRequest.findFirst({
      where: { id, driver_id: driverId },
    })
    if (!existing) {
      throw Object.assign(new Error("Pedido não encontrado"), { statusCode: 404 })
    }
    const row = await this.prisma.boardingRequest.update({
      where: { id },
      data: {
        status: status as PrismaStatus,
        flagged: status === "PENDING",
      },
      include: {
        cadete: { select: { full_name: true, stop: { select: { stop_name: true } } } },
      },
    })
    return this.map(row)
  }

  async admitNow(input: {
    cadeteId: number
    driverId: number
    routeId: number
  }): Promise<BoardingRequest> {
    const pending = await this.findPending(input.cadeteId, input.driverId, input.routeId)
    if (pending) {
      return this.updateStatus(pending.id, input.driverId, "APPROVED")
    }
    const row = await this.prisma.boardingRequest.create({
      data: {
        cadete_id: input.cadeteId,
        driver_id: input.driverId,
        route_id: input.routeId,
        status: PrismaStatus.APPROVED,
        flagged: false,
      },
      include: {
        cadete: { select: { full_name: true, stop: { select: { stop_name: true } } } },
      },
    })
    return this.map(row)
  }

  async createForTrip(input: { tripId: number; cadeteId: number }): Promise<BoardingRequest> {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const trip = await tx.trip.findUnique({ where: { id: input.tripId } })
          if (!trip) throw new ApplicationError("Viagem não encontrada", 404)
          if (trip.status !== PrismaTripStatus.ACTIVE) {
            throw new ApplicationError("A viagem não está ativa", 409)
          }

          const cadete = await tx.cadetes.findUnique({
            where: { id: input.cadeteId },
            include: { stop: true },
          })
          if (!cadete) throw new ApplicationError("Cadete não encontrado", 404)
          if (!cadete.stop || cadete.stop.route_id !== trip.route_id) {
            throw new ApplicationError("A paragem do cadete não pertence à rota desta viagem", 409)
          }

          const approved = await tx.boardingRequest.count({
            where: {
              trip_id: input.tripId,
              status: PrismaStatus.APPROVED,
            },
          })
          if (approved >= trip.vehicle_capacity) {
            throw new ApplicationError("A viagem atingiu a capacidade máxima", 409)
          }

          const duplicate = await tx.boardingRequest.findFirst({
            where: { trip_id: input.tripId, cadete_id: input.cadeteId },
          })
          if (duplicate) {
            throw new ApplicationError("Já existe um pedido deste cadete nesta viagem", 409)
          }

          const row = await tx.boardingRequest.create({
            data: {
              trip_id: trip.id,
              cadete_id: input.cadeteId,
              driver_id: trip.driver_id,
              route_id: trip.route_id,
              status: PrismaStatus.PENDING,
              flagged: true,
            },
            include: {
              cadete: { select: { full_name: true, stop: { select: { stop_name: true } } } },
            },
          })
          return this.map(row)
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      )
    } catch (error: any) {
      if (error instanceof ApplicationError) throw error
      if (error?.code === "P2002") {
        throw new ApplicationError("Já existe um pedido deste cadete nesta viagem", 409)
      }
      if (error?.code === "P2034") {
        throw new ApplicationError("Conflito concorrente; tente novamente", 409)
      }
      throw error
    }
  }

  async listMine(cadeteId: number, tripId?: number): Promise<BoardingRequest[]> {
    const rows = await this.prisma.boardingRequest.findMany({
      where: {
        cadete_id: cadeteId,
        trip_id: tripId !== undefined ? tripId : { not: null },
      },
      include: {
        cadete: { select: { full_name: true, stop: { select: { stop_name: true } } } },
      },
      orderBy: { createdAt: "desc" },
    })
    return rows.map((row) => this.map(row))
  }

  async listForTrip(tripId: number, status?: BoardingRequestStatus): Promise<BoardingRequest[]> {
    const rows = await this.prisma.boardingRequest.findMany({
      where: {
        trip_id: tripId,
        ...(status ? { status: status as PrismaStatus } : {}),
      },
      include: {
        cadete: { select: { full_name: true, stop: { select: { stop_name: true } } } },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    })
    return rows.map((row) => this.map(row))
  }

  async findById(id: number): Promise<BoardingRequest | null> {
    const row = await this.prisma.boardingRequest.findUnique({
      where: { id },
      include: {
        cadete: { select: { full_name: true, stop: { select: { stop_name: true } } } },
      },
    })
    return row ? this.map(row) : null
  }

  async decideForTrip(
    id: number,
    status: Exclude<BoardingRequestStatus, "PENDING">,
  ): Promise<BoardingRequest> {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const request = await tx.boardingRequest.findUnique({
            where: { id },
            include: { trip: true },
          })
          if (!request) throw new ApplicationError("Pedido não encontrado", 404)
          if (!request.trip_id || !request.trip) {
            throw new ApplicationError("Pedido legado sem viagem associada", 409)
          }
          if (request.status === status) {
            const row = await tx.boardingRequest.findUnique({
              where: { id },
              include: {
                cadete: { select: { full_name: true, stop: { select: { stop_name: true } } } },
              },
            })
            return this.map(row!)
          }
          if (request.status !== PrismaStatus.PENDING) {
            throw new ApplicationError("O pedido já foi decidido", 409)
          }
          if (request.trip.status !== PrismaTripStatus.ACTIVE) {
            throw new ApplicationError("A viagem não está ativa", 409)
          }

          if (status === "APPROVED") {
            const approved = await tx.boardingRequest.count({
              where: { trip_id: request.trip_id, status: PrismaStatus.APPROVED },
            })
            if (approved >= request.trip.vehicle_capacity) {
              throw new ApplicationError("A viagem atingiu a capacidade máxima", 409)
            }
          }

          const row = await tx.boardingRequest.update({
            where: { id },
            data: { status: status as PrismaStatus, flagged: false },
            include: {
              cadete: { select: { full_name: true, stop: { select: { stop_name: true } } } },
            },
          })
          return this.map(row)
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      )
    } catch (error: any) {
      if (error instanceof ApplicationError) throw error
      if (error?.code === "P2034") {
        throw new ApplicationError("Conflito concorrente; tente novamente", 409)
      }
      throw error
    }
  }

  private map(row: any): BoardingRequest {
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
