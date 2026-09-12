import { PrismaClient, BoardingRequestStatus as PrismaStatus } from "@prisma/client"
import { BoardingRequestRepository } from "../../domain/boarding/BoardingRequestRepository"
import { BoardingRequest, BoardingRequestStatus } from "../../domain/boarding/BoardingRequest"

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

  private map(row: any): BoardingRequest {
    return {
      id: row.id,
      cadeteId: row.cadete_id,
      driverId: row.driver_id,
      routeId: row.route_id,
      status: row.status,
      flagged: row.flagged,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      cadeteName: row.cadete?.full_name ?? null,
      stopName: row.cadete?.stop?.stop_name ?? null,
    }
  }
}
