import { FastifyReply, FastifyRequest } from "fastify"
import {
  CancelTripUseCase,
  CompleteTripUseCase,
  CreateTripUseCase,
  GetActiveTripUseCase,
  GetTripByIdUseCase,
  ListTripsUseCase,
  parseTripStatus,
  TripActor,
  UpdateTripUseCase,
} from "../../../application/trips/useCases/TripUseCases"
import { ApplicationError } from "../../../application/errors/ApplicationError"
import { JWTPayload } from "../../../utils/jwt"

function actorFrom(req: FastifyRequest): TripActor {
  const user = req.user as JWTPayload
  return { id: Number(user.id), role: user.role }
}

function dateFrom(value: unknown, name: string): Date | undefined {
  if (!value) return undefined
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) {
    throw new ApplicationError(`${name} deve ser uma data válida`, 422)
  }
  return date
}

function positiveId(value: unknown): number {
  const id = Number(value)
  if (!Number.isInteger(id) || id <= 0) {
    throw new ApplicationError("O identificador deve ser um inteiro positivo", 422)
  }
  return id
}

export class TripController {
  constructor(
    private readonly createTrip: CreateTripUseCase,
    private readonly getActiveTrip: GetActiveTripUseCase,
    private readonly listTrips: ListTripsUseCase,
    private readonly getTrip: GetTripByIdUseCase,
    private readonly updateTrip: UpdateTripUseCase,
    private readonly completeTrip: CompleteTripUseCase,
    private readonly cancelTrip: CancelTripUseCase,
  ) {}

  async create(req: FastifyRequest, reply: FastifyReply) {
    try {
      const body = req.body as any
      const result = await this.createTrip.execute(actorFrom(req), {
        vehicleName: body.vehicle_name,
        vehiclePlate: body.vehicle_plate,
        vehicleCapacity: Number(body.vehicle_capacity),
      })
      return reply.code(201).send(result)
    } catch (error) {
      return this.handle(error, reply)
    }
  }

  async active(req: FastifyRequest, reply: FastifyReply) {
    try {
      const trip = await this.getActiveTrip.execute(actorFrom(req))
      if (!trip) throw new ApplicationError("Não existe uma viagem ativa", 404)
      return reply.send(trip)
    } catch (error) {
      return this.handle(error, reply)
    }
  }

  async list(req: FastifyRequest, reply: FastifyReply) {
    try {
      const query = req.query as any
      const result = await this.listTrips.execute(actorFrom(req), {
        status: parseTripStatus(query.status),
        routeId: query.routeId !== undefined ? Number(query.routeId) : undefined,
        driverId: query.driverId !== undefined ? Number(query.driverId) : undefined,
        dateFrom: dateFrom(query.from ?? query.dateFrom, "from"),
        dateTo: dateFrom(query.to ?? query.dateTo, "to"),
        page: query.page !== undefined ? Number(query.page) : 1,
        limit: query.limit !== undefined ? Number(query.limit) : 20,
      })
      return reply.send(result)
    } catch (error) {
      return this.handle(error, reply)
    }
  }

  async getById(req: FastifyRequest, reply: FastifyReply) {
    try {
      return reply.send(
        await this.getTrip.execute(
          actorFrom(req),
          positiveId((req.params as any).id),
        ),
      )
    } catch (error) {
      return this.handle(error, reply)
    }
  }

  async update(req: FastifyRequest, reply: FastifyReply) {
    try {
      const body = req.body as any
      return reply.send(
        await this.updateTrip.execute(
          actorFrom(req),
          positiveId((req.params as any).id),
          {
            vehicleName: body.vehicle_name,
            vehiclePlate: body.vehicle_plate,
            vehicleCapacity:
              body.vehicle_capacity === undefined
                ? undefined
                : Number(body.vehicle_capacity),
          },
        ),
      )
    } catch (error) {
      return this.handle(error, reply)
    }
  }

  async complete(req: FastifyRequest, reply: FastifyReply) {
    try {
      return reply.send(
        await this.completeTrip.execute(
          actorFrom(req),
          positiveId((req.params as any).id),
        ),
      )
    } catch (error) {
      return this.handle(error, reply)
    }
  }

  async cancel(req: FastifyRequest, reply: FastifyReply) {
    try {
      return reply.send(
        await this.cancelTrip.execute(
          actorFrom(req),
          positiveId((req.params as any).id),
        ),
      )
    } catch (error) {
      return this.handle(error, reply)
    }
  }

  private handle(error: unknown, reply: FastifyReply) {
    if (error instanceof ApplicationError) {
      return reply.status(error.statusCode).send({ error: error.message })
    }
    reply.log.error(error)
    return reply.status(500).send({ error: "Internal server error" })
  }
}
