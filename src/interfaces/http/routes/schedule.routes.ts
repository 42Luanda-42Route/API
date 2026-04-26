import { FastifyInstance } from "fastify"
import { SchedulePrismaRepository } from "../../../infrastructure/repositories/SchedulePrismaRepository"
import { ScheduleController } from "../controllers/ScheduleController"
import { ListSchedulesUseCase } from "../../../application/schedules/useCases/ListSchedulesUseCase"

export default async function scheduleRoutes(app: FastifyInstance) {
  const repo = new SchedulePrismaRepository(app.prisma)
  const controller = new ScheduleController(
    new ListSchedulesUseCase(repo)
  )

  // GET /api/schedules — list all active schedules
  // GET /api/schedules?route_id=2 — filter by route
  app.get("/schedules", (req, reply) => controller.list(req, reply))
}
