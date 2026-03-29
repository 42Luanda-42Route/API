import { FastifyInstance } from "fastify"
import { MiniBusStopPrismaRepository } from "../../../infrastructure/repositories/MiniBusStopPrismaRepository"
import { RoutePrismaRepository } from "../../../infrastructure/repositories/RoutePrismaRepository"
import { MiniBusStopController } from "../controllers/MiniBusStopController"
import { ListStopsUseCase } from "../../../application/miniBusStops/useCases/ListStops"
import { GetStopByIdUseCase } from "../../../application/miniBusStops/useCases/GetStopById"
import { CreateStopUseCase } from "../../../application/miniBusStops/useCases/CreateStop"
import { UpdateStopUseCase } from "../../../application/miniBusStops/useCases/UpdateStop"
import { DeleteStopUseCase } from "../../../application/miniBusStops/useCases/DeleteStop"

export default async function minibusstopsRoutes(app: FastifyInstance) {
  const stopRepo = new MiniBusStopPrismaRepository(app.prisma)
  const routeRepo = new RoutePrismaRepository(app.prisma)
  const controller = new MiniBusStopController(
    new ListStopsUseCase(stopRepo),
    new GetStopByIdUseCase(stopRepo),
    new CreateStopUseCase(stopRepo, routeRepo),
    new UpdateStopUseCase(stopRepo, routeRepo),
    new DeleteStopUseCase(stopRepo),
  )

  app.get("/minibusstops", (req, reply) => controller.list(req, reply))
  app.get("/minibusstop/:id", (req, reply) => controller.getById(req, reply))
  app.post("/minibusstop", (req, reply) => controller.create(req, reply))
  app.put("/minibusstop/:id", (req, reply) => controller.update(req, reply))
  app.delete("/minibusstop/:id", (req, reply) => controller.delete(req, reply))
}
