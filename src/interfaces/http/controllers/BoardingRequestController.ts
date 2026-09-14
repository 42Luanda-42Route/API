import { FastifyReply, FastifyRequest } from "fastify"
import {
  CreateTripBoardingRequestUseCase,
  DecideBoardingRequestUseCase,
  ListMyBoardingRequestsUseCase,
  ListTripBoardingRequestsUseCase,
} from "../../../application/boarding/useCases/TripBoardingUseCases"
import { ApplicationError } from "../../../application/errors/ApplicationError"
import { BoardingRequestStatus } from "../../../domain/boarding/BoardingRequest"
import { JWTPayload } from "../../../utils/jwt"

function actorFrom(req: FastifyRequest) {
  const user = req.user as JWTPayload
  return { id: Number(user.id), role: user.role }
}

export class BoardingRequestController {
  constructor(
    private readonly createRequest: CreateTripBoardingRequestUseCase,
    private readonly listMine: ListMyBoardingRequestsUseCase,
    private readonly listForTrip: ListTripBoardingRequestsUseCase,
    private readonly decideRequest: DecideBoardingRequestUseCase,
  ) {}

  async create(req: FastifyRequest, reply: FastifyReply) {
    try {
      const tripId = Number((req.params as any).tripId)
      const result = await this.createRequest.execute(actorFrom(req), tripId)
      return reply.code(201).send(result)
    } catch (error) {
      return this.handle(error, reply)
    }
  }

  async mine(req: FastifyRequest, reply: FastifyReply) {
    try {
      const query = req.query as any
      const tripId = query.tripId !== undefined ? Number(query.tripId) : undefined
      return reply.send({ data: await this.listMine.execute(actorFrom(req), tripId) })
    } catch (error) {
      return this.handle(error, reply)
    }
  }

  async forTrip(req: FastifyRequest, reply: FastifyReply) {
    try {
      const tripId = Number((req.params as any).tripId)
      const status = (req.query as any).status as BoardingRequestStatus | undefined
      return reply.send({ data: await this.listForTrip.execute(actorFrom(req), tripId, status) })
    } catch (error) {
      return this.handle(error, reply)
    }
  }

  async update(req: FastifyRequest, reply: FastifyReply) {
    try {
      const requestId = Number((req.params as any).id)
      const status = (req.body as any).status as "APPROVED" | "REJECTED"
      return reply.send(await this.decideRequest.execute(actorFrom(req), requestId, status))
    } catch (error) {
      return this.handle(error, reply)
    }
  }

  private handle(error: unknown, reply: FastifyReply) {
    if (error instanceof ApplicationError) {
      return reply.status(error.statusCode).send(error.toPayload())
    }
    reply.log.error(error)
    return reply.status(500).send({ error: "Internal server error" })
  }
}
