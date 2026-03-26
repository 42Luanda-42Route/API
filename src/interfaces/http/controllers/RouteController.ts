import { FastifyReply, FastifyRequest } from "fastify"
import { CreateRouteUseCase } from "../../../application/routes/useCases/CreateRoute"
import { AddStopsToRouteUseCase } from "../../../application/routes/useCases/AddStopsToRoute"
import { ListRoutesUseCase } from "../../../application/routes/useCases/ListRoutes"
import { GetRouteByIdUseCase } from "../../../application/routes/useCases/GetRouteById"
import { ApplicationError } from "../../../application/errors/ApplicationError"

interface CreateRouteBody {
  route_name: string
  description?: string | null
}

interface AddStopsParams {
  id: string
}

interface AddStopsBody {
  stop_id: number[]
}

interface RouteIdParams {
  id: string
}

export class RouteController {
  constructor(
    private readonly createRoute: CreateRouteUseCase,
    private readonly addStopsToRoute: AddStopsToRouteUseCase,
    private readonly listRoutes: ListRoutesUseCase,
    private readonly getRouteById: GetRouteByIdUseCase,
  ) {}

  async create(req: FastifyRequest<{ Body: CreateRouteBody }>, reply: FastifyReply) {
    try {
      const result = await this.createRoute.execute({
        routeName: req.body.route_name,
        description: req.body.description,
      })
      return reply.code(201).send(result)
    } catch (error) {
      return this.handleError(error, reply)
    }
  }

  async addStops(req: FastifyRequest<{ Params: AddStopsParams; Body: AddStopsBody }>, reply: FastifyReply) {
    try {
      const routeId = Number(req.params.id)
      const result = await this.addStopsToRoute.execute({
        routeId,
        stopIds: req.body.stop_id,
      })
      return reply.code(200).send(result)
    } catch (error) {
      return this.handleError(error, reply)
    }
  }

  async list(req: FastifyRequest, reply: FastifyReply) {
    try {
      const result = await this.listRoutes.execute()
      return reply.code(200).send(result)
    } catch (error) {
      return this.handleError(error, reply)
    }
  }

  async getById(req: FastifyRequest<{ Params: RouteIdParams }>, reply: FastifyReply) {
    try {
      const routeId = Number(req.params.id)
      const result = await this.getRouteById.execute(routeId)
      return reply.code(200).send(result)
    } catch (error) {
      return this.handleError(error, reply)
    }
  }

  private handleError(error: unknown, reply: FastifyReply) {
    if (error instanceof ApplicationError) {
      return reply.status(error.statusCode).send({ error: error.message })
    }

    reply.log.error(error)
    return reply.status(500).send({ error: "Internal server error" })
  }
}
