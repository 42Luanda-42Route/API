import { FastifyInstance, FastifyRequest } from "fastify"
import { MiniBusStopPrismaRepository } from "../../../infrastructure/repositories/MiniBusStopPrismaRepository"
import { RoutePrismaRepository } from "../../../infrastructure/repositories/RoutePrismaRepository"
import { MiniBusStopController } from "../controllers/MiniBusStopController"
import { ListStopsUseCase } from "../../../application/miniBusStops/useCases/ListStops"
import { GetStopByIdUseCase } from "../../../application/miniBusStops/useCases/GetStopById"
import { CreateStopUseCase } from "../../../application/miniBusStops/useCases/CreateStop"
import { UpdateStopUseCase } from "../../../application/miniBusStops/useCases/UpdateStop"
import { DeleteStopUseCase } from "../../../application/miniBusStops/useCases/DeleteStop"
import { CreateStopInput, UpdateStopInput } from "../../../application/miniBusStops/dto"

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
  app.get("/minibusstop/:id", async (req, reply) => controller.getById(req as FastifyRequest<{ Params: { id: string } }>, reply))
  app.post("/minibusstop", async (req, reply) => controller.create(req as FastifyRequest<{ Body: CreateStopInput }>, reply))
  app.put("/minibusstop/:id", async (req, reply) => controller.update(req as FastifyRequest<{ Params: { id: string }; Body: UpdateStopInput }>, reply))
  app.delete("/minibusstop/:id", async (req, reply) => controller.delete(req as FastifyRequest<{ Params: { id: string } }>, reply))
}
