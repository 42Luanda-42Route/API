import { FastifyInstance } from "fastify"
import { DriverPrismaRepository } from "../../../infrastructure/repositories/DriverPrismaRepository"
import { RoutePrismaRepository } from "../../../infrastructure/repositories/RoutePrismaRepository"
import { DriverController } from "../controllers/DriverController"
import { ListDriversUseCase } from "../../../application/drivers/useCases/ListDrivers"
import { GetDriverByIdUseCase } from "../../../application/drivers/useCases/GetDriverById"
import { CreateDriverUseCase } from "../../../application/drivers/useCases/CreateDriver"
import { UpdateDriverUseCase } from "../../../application/drivers/useCases/UpdateDriver"
import { DeleteDriverUseCase } from "../../../application/drivers/useCases/DeleteDriver"
import { UpdateDriverLocationUseCase } from "../../../application/drivers/useCases/UpdateDriverLocation"
import { AssignRouteUseCase } from "../../../application/drivers/useCases/AssignRoute"
import { LeaveRouteUseCase } from "../../../application/drivers/useCases/LeaveRoute"
import { LoginDriverUseCase } from "../../../application/drivers/useCases/LoginDriver"

export default async function driverRoutes(app: FastifyInstance) {
  const driverRepo = new DriverPrismaRepository(app.prisma)
  const routeRepo = new RoutePrismaRepository(app.prisma)
  const controller = new DriverController(
    new ListDriversUseCase(driverRepo),
    new GetDriverByIdUseCase(driverRepo),
    new CreateDriverUseCase(driverRepo),
    new UpdateDriverUseCase(driverRepo),
    new DeleteDriverUseCase(driverRepo),
    new UpdateDriverLocationUseCase(driverRepo),
    new AssignRouteUseCase(driverRepo, routeRepo),
    new LeaveRouteUseCase(driverRepo),
    new LoginDriverUseCase(driverRepo),
  )

  // Public routes
  app.get("/drivers", (req, reply) => controller.list(req, reply))
  app.get("/driver/:id", (req, reply) => controller.getById(req, reply))

  // Protected routes
  app.post("/driver", { preHandler: [app.authenticate] }, async (req, reply) => controller.create(req as any, reply))
  app.put("/driver/:id", { preHandler: [app.authenticate] }, async (req, reply) => controller.update(req as any, reply))
  app.delete("/driver/:id", { preHandler: [app.authenticate] }, async (req, reply) => controller.delete(req as any, reply))
  app.put("/driver/location/socket/:id", { preHandler: [app.authenticate] }, async (req, reply) => controller.updateLocationHandler(req as any, reply))
  app.post("/driver/assign/route/:id", { preHandler: [app.authenticate] }, async (req, reply) => controller.assignRouteHandler(req as any, reply))
  app.delete("/driver/leave/route/:id", { preHandler: [app.authenticate] }, async (req, reply) => controller.leaveRouteHandler(req as any, reply))
}
