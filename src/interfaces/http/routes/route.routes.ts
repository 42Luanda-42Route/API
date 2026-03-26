import { FastifyInstance } from "fastify"
import { RoutePrismaRepository } from "../../../infrastructure/repositories/RoutePrismaRepository"
import { RouteController } from "../controllers/RouteController"
import { CreateRouteUseCase } from "../../../application/routes/useCases/CreateRoute"
import { AddStopsToRouteUseCase } from "../../../application/routes/useCases/AddStopsToRoute"
import { ListRoutesUseCase } from "../../../application/routes/useCases/ListRoutes"
import { GetRouteByIdUseCase } from "../../../application/routes/useCases/GetRouteById"

export default async function routeRoutes(app: FastifyInstance) {
  const routeRepository = new RoutePrismaRepository(app.prisma)
  const controller = new RouteController(
    new CreateRouteUseCase(routeRepository),
    new AddStopsToRouteUseCase(routeRepository),
    new ListRoutesUseCase(routeRepository),
    new GetRouteByIdUseCase(routeRepository),
  )

  app.post("/routes", (req, reply) => controller.create(req, reply))
  app.post("/routes/:id/stops", (req, reply) => controller.addStops(req, reply))
  app.get("/routes", (req, reply) => controller.list(req, reply))
  app.get("/route/:id", (req, reply) => controller.getById(req, reply))
}
