import { FastifyReply, FastifyRequest } from "fastify"
import { ListStopsUseCase } from "../../../application/miniBusStops/useCases/ListStops"
import { GetStopByIdUseCase } from "../../../application/miniBusStops/useCases/GetStopById"
import { CreateStopUseCase } from "../../../application/miniBusStops/useCases/CreateStop"
import { UpdateStopUseCase } from "../../../application/miniBusStops/useCases/UpdateStop"
import { DeleteStopUseCase } from "../../../application/miniBusStops/useCases/DeleteStop"
import { ApplicationError } from "../../../application/errors/ApplicationError"
import { CreateStopInput, UpdateStopInput } from "../../../application/miniBusStops/dto"

export class MiniBusStopController {
  constructor(
    private readonly listStops: ListStopsUseCase,
    private readonly getStopById: GetStopByIdUseCase,
    private readonly createStop: CreateStopUseCase,
    private readonly updateStop: UpdateStopUseCase,
    private readonly deleteStop: DeleteStopUseCase,
  ) {}

  async list(req: FastifyRequest, reply: FastifyReply) {
    try {
      const result = await this.listStops.execute()
      return reply.send(result)
    } catch (error) {
      return this.handle(error, reply)
    }
  }

  async getById(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const result = await this.getStopById.execute(Number(req.params.id))
      return reply.send(result)
    } catch (error) {
      return this.handle(error, reply)
    }
  }

  async create(req: FastifyRequest<{ Body: CreateStopInput }>, reply: FastifyReply) {
    try {
      const result = await this.createStop.execute(req.body)
      return reply.code(201).send(result)
    } catch (error) {
      return this.handle(error, reply)
    }
  }

  async update(req: FastifyRequest<{ Params: { id: string }; Body: UpdateStopInput }>, reply: FastifyReply) {
    try {
      const result = await this.updateStop.execute(Number(req.params.id), req.body)
      return reply.send(result)
    } catch (error) {
      return this.handle(error, reply)
    }
  }

  async delete(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      await this.deleteStop.execute(Number(req.params.id))
      return reply.send({ message: "Bus stop deleted successfully" })
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
