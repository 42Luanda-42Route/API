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
    const trip = await this.prisma.trip.findFirst({
      where: {
        driver_id: input.driverId,
        route_id: input.routeId,
        status: PrismaTripStatus.ACTIVE,
      },
      orderBy: { startedAt: "desc" },
    })
    if (!trip) {
      throw new ApplicationError(
        `O motorista #${input.driverId} não tem viagem ACTIVE nesta rota. Inicie uma viagem antes do scan QR.`,
        409,
        {
          code: "NO_ACTIVE_TRIP",
          hint: "Motorista: POST /api/trips. Cadete: peça embarque em POST /api/trips/:tripId/boarding-requests após GET /api/trips/active.",
        },
      )
    }
    return this.createForTrip({ tripId: trip.id, cadeteId: input.cadeteId })
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
    const active = await this.prisma.trip.findFirst({
      where: { driver_id: driverId, status: PrismaTripStatus.ACTIVE },
      orderBy: { startedAt: "desc" },
    })
    if (active) {
      return this.listForTrip(active.id, status)
    }
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
    const trip = await this.prisma.trip.findFirst({
      where: {
        driver_id: input.driverId,
        route_id: input.routeId,
        status: PrismaTripStatus.ACTIVE,
      },
      orderBy: { startedAt: "desc" },
    })
    if (!trip) {
      throw new ApplicationError(
        `O motorista #${input.driverId} não tem viagem ACTIVE nesta rota. Inicie uma viagem antes de admitir por QR.`,
        409,
        {
          code: "NO_ACTIVE_TRIP",
          hint: "Crie a viagem com POST /api/trips e volte a escanear o QR do cadete.",
        },
      )
    }

    const pendingOnTrip = await this.prisma.boardingRequest.findFirst({
      where: {
        trip_id: trip.id,
        cadete_id: input.cadeteId,
        status: PrismaStatus.PENDING,
      },
    })
    if (pendingOnTrip) {
      return this.decideForTrip(pendingOnTrip.id, "APPROVED")
    }

    const legacyPending = await this.findPending(input.cadeteId, input.driverId, input.routeId)
    if (legacyPending) {
      // Liga o pedido legado à viagem activa e aprova com as regras de capacidade.
      await this.prisma.boardingRequest.update({
        where: { id: legacyPending.id },
        data: { trip_id: trip.id },
      })
      return this.decideForTrip(legacyPending.id, "APPROVED")
    }

    const existing = await this.prisma.boardingRequest.findFirst({
      where: { trip_id: trip.id, cadete_id: input.cadeteId },
    })
    if (existing) {
      if (existing.status === PrismaStatus.APPROVED) {
        return (await this.findById(existing.id))!
      }
      return this.decideForTrip(existing.id, "APPROVED")
    }

    const approved = await this.prisma.boardingRequest.count({
      where: { trip_id: trip.id, status: PrismaStatus.APPROVED },
    })
    if (approved >= trip.vehicle_capacity) {
      throw new ApplicationError(
        `A viagem #${trip.id} atingiu a capacidade máxima (${trip.vehicle_capacity} lugares).`,
        409,
        {
          code: "TRIP_FULL",
          hint: "Rejeite um pedido ou aumente a capacidade da viagem.",
        },
      )
    }

    const row = await this.prisma.boardingRequest.create({
      data: {
        cadete_id: input.cadeteId,
        driver_id: input.driverId,
        route_id: input.routeId,
        trip_id: trip.id,
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
          if (!trip) {
            throw new ApplicationError(`Viagem #${input.tripId} não encontrada.`, 404, {
              code: "TRIP_NOT_FOUND",
              hint: "Confirme o tripId em GET /api/trips/active.",
            })
          }
          if (trip.status !== PrismaTripStatus.ACTIVE) {
            throw new ApplicationError(
              `Não é possível pedir embarque: a viagem #${input.tripId} está ${trip.status}, não ACTIVE.`,
              409,
              {
                code: "TRIP_NOT_ACTIVE",
                hint: "Peça embarque apenas enquanto a viagem estiver ACTIVE.",
              },
            )
          }

          const cadete = await tx.cadetes.findUnique({
            where: { id: input.cadeteId },
            include: { stop: true },
          })
          if (!cadete) {
            throw new ApplicationError(`Cadete #${input.cadeteId} não encontrado.`, 404, {
              code: "CADETE_NOT_FOUND",
              hint: "O JWT tem de usar o id da tabela Cadetes.",
            })
          }
          if (!cadete.stop || cadete.stop.route_id !== trip.route_id) {
            throw new ApplicationError(
              `A paragem do cadete #${input.cadeteId} não pertence à rota #${trip.route_id} da viagem #${trip.id}.`,
              409,
              {
                code: "CADETE_WRONG_ROUTE",
                hint: "Atualize stop_id em PUT /api/cadetes/:id para uma paragem desta rota.",
              },
            )
          }

          const approved = await tx.boardingRequest.count({
            where: {
              trip_id: input.tripId,
              status: PrismaStatus.APPROVED,
            },
          })
          if (approved >= trip.vehicle_capacity) {
            throw new ApplicationError(
              `A viagem #${trip.id} atingiu a capacidade máxima (${trip.vehicle_capacity} lugares).`,
              409,
              {
                code: "TRIP_FULL",
                hint: "Aguarde outra viagem ou fale com o motorista.",
              },
            )
          }

          const duplicate = await tx.boardingRequest.findFirst({
            where: { trip_id: input.tripId, cadete_id: input.cadeteId },
          })
          if (duplicate) {
            throw new ApplicationError(
              `Já existe o pedido #${duplicate.id} (${duplicate.status}) do cadete #${input.cadeteId} nesta viagem.`,
              409,
              {
                code: "DUPLICATE_BOARDING_REQUEST",
                hint: "Consulte GET /api/boarding-requests/mine?tripId=" + input.tripId,
              },
            )
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
        ...(tripId !== undefined ? { trip_id: tripId } : {}),
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
          if (!request) throw new ApplicationError(`Pedido de embarque #${id} não encontrado.`, 404, {
            code: "BOARDING_NOT_FOUND",
            hint: "Liste pedidos em GET /api/qr/boarding/requests ou GET /api/trips/:tripId/boarding-requests.",
          })
          if (!request.trip_id || !request.trip) {
            if (request.status !== PrismaStatus.PENDING && request.status !== status) {
              throw new ApplicationError(
                `O pedido #${id} já foi ${request.status}. Pedidos QR sem viagem não podem ser reabertos.`,
                409,
                {
                  code: "BOARDING_ALREADY_DECIDED",
                  hint: "Crie um novo pedido com scan/admit se precisar de outra decisão.",
                },
              )
            }
            const row = await tx.boardingRequest.update({
              where: { id },
              data: { status: status as PrismaStatus, flagged: false },
              include: {
                cadete: { select: { full_name: true, stop: { select: { stop_name: true } } } },
              },
            })
            return this.map(row)
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
            throw new ApplicationError(
              `O pedido #${id} já foi ${request.status}. Não pode voltar a decidir.`,
              409,
              {
                code: "BOARDING_ALREADY_DECIDED",
                hint: "Só pedidos PENDING podem ser APPROVED ou REJECTED.",
              },
            )
          }
          if (request.trip.status !== PrismaTripStatus.ACTIVE) {
            throw new ApplicationError(
              `Não é possível decidir o pedido #${id}: a viagem #${request.trip_id} está ${request.trip.status}.`,
              409,
              {
                code: "TRIP_NOT_ACTIVE",
                hint: "Só se decide embarque enquanto a viagem está ACTIVE.",
              },
            )
          }

          if (status === "APPROVED") {
            const approved = await tx.boardingRequest.count({
              where: { trip_id: request.trip_id, status: PrismaStatus.APPROVED },
            })
            if (approved >= request.trip.vehicle_capacity) {
              throw new ApplicationError(
                `A viagem #${request.trip_id} atingiu a capacidade máxima (${request.trip.vehicle_capacity} lugares). Não é possível APPROVED o pedido #${id}.`,
                409,
                {
                  code: "TRIP_FULL",
                  hint: "Rejeite o pedido ou aumente a capacidade (PATCH /api/trips/:id, ADMIN).",
                },
              )
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