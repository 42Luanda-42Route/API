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

  app.get("/drivers", (req, reply) => controller.list(req, reply))
  app.get("/driver/:id", (req, reply) => controller.getById(req, reply))
  app.post("/driver", (req, reply) => controller.create(req, reply))
  app.put("/driver/:id", (req, reply) => controller.update(req, reply))
  app.delete("/driver/:id", (req, reply) => controller.delete(req, reply))
  app.put("/driver/location/socket/:id", (req, reply) => controller.updateLocationHandler(req, reply))
  app.post("/driver/assign/route/:id", (req, reply) => controller.assignRouteHandler(req, reply))
  app.delete("/driver/leave/route/:id", (req, reply) => controller.leaveRouteHandler(req, reply))
}
