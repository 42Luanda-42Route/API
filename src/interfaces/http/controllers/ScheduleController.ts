import { FastifyRequest, FastifyReply } from "fastify"
import { ListSchedulesUseCase } from "../../../application/schedules/useCases/ListSchedulesUseCase"

export class ScheduleController {
  constructor(private readonly listSchedules: ListSchedulesUseCase) {}

  async list(req: FastifyRequest, reply: FastifyReply) {
    const { route_id } = req.query as { route_id?: string }
    const routeId = route_id ? Number(route_id) : undefined

    const schedules = await this.listSchedules.execute(routeId)
    return reply.send(schedules)
  }
}
