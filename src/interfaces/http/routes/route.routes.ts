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

  // Public routes
  app.get("/routes", (req, reply) => controller.list(req as any, reply))
  app.get("/routes/:id", (req, reply) => controller.getById(req as any, reply))
  app.get("/route/:id", (req, reply) => controller.getById(req as any, reply))

  // Protected routes
  app.post("/routes", { preHandler: [app.authenticate] }, async (req, reply) => controller.create(req as any, reply))
  app.post("/routes/:id/stops", { preHandler: [app.authenticate] }, async (req, reply) => controller.addStops(req as any, reply))
}
