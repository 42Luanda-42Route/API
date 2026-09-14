import { FastifyReply, FastifyRequest } from "fastify"
import { ListCadetesUseCase } from "../../../application/cadetes/useCases/ListCadetes"
import { GetCadeteByIdUseCase } from "../../../application/cadetes/useCases/GetCadeteById"
import { CreateCadeteUseCase } from "../../../application/cadetes/useCases/CreateCadete"
import { UpdateCadeteUseCase } from "../../../application/cadetes/useCases/UpdateCadete"
import { DeleteCadeteUseCase } from "../../../application/cadetes/useCases/DeleteCadete"
import { GetCadeteRouteInfoUseCase } from "../../../application/cadetes/useCases/GetCadeteRouteInfo"
import { ApplicationError } from "../../../application/errors/ApplicationError"
import { CreateCadeteInput, UpdateCadeteInput } from "../../../application/cadetes/dto"
import { JWTPayload } from "../../../utils/jwt"

export class CadeteController {
  constructor(
    private readonly listCadetes: ListCadetesUseCase,
    private readonly getCadeteById: GetCadeteByIdUseCase,
    private readonly createCadete: CreateCadeteUseCase,
    private readonly updateCadete: UpdateCadeteUseCase,
    private readonly deleteCadete: DeleteCadeteUseCase,
    private readonly getCadeteRouteInfo: GetCadeteRouteInfoUseCase,
  ) {}

  async list(req: FastifyRequest<{ Querystring: { page?: string; limit?: string } }>, reply: FastifyReply) {
    try {
      const page = req.query?.page ? Number(req.query.page) : 1
      const limit = req.query?.limit ? Number(req.query.limit) : 20
      const result = await this.listCadetes.execute(page, limit)
      return reply.send(result)
    } catch (error) {
      return this.handle(error, reply)
    }
  }

  async getById(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const result = await this.getCadeteById.execute(Number(req.params.id))
      return reply.send(result)
    } catch (error) {
      return this.handle(error, reply)
    }
  }

  async create(req: FastifyRequest<{ Body: CreateCadeteInput }>, reply: FastifyReply) {
    try {
      const result = await this.createCadete.execute(req.body)
      return reply.code(201).send(result)
    } catch (error) {
      return this.handle(error, reply)
    }
  }

  async update(req: FastifyRequest<{ Params: { id: string }; Body: UpdateCadeteInput }>, reply: FastifyReply) {
    try {
      const user = req.user as JWTPayload
      const result = await this.updateCadete.execute(Number(req.params.id), req.body, {
        id: Number(user.id),
        role: user.role,
      })
      return reply.send(result)
    } catch (error) {
      return this.handle(error, reply)
    }
  }

  async delete(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      await this.deleteCadete.execute(Number(req.params.id))
      return reply.status(204).send()
    } catch (error) {
      return this.handle(error, reply)
    }
  }

  async getRouteInfo(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const result = await this.getCadeteRouteInfo.execute(Number(req.params.id))
      return reply.send(result)
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
