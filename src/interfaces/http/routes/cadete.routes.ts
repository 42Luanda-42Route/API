import { FastifyInstance } from "fastify"
import { CadetePrismaRepository } from "../../../infrastructure/repositories/CadetePrismaRepository"
import { CadeteController } from "../controllers/CadeteController"
import { ListCadetesUseCase } from "../../../application/cadetes/useCases/ListCadetes"
import { GetCadeteByIdUseCase } from "../../../application/cadetes/useCases/GetCadeteById"
import { CreateCadeteUseCase } from "../../../application/cadetes/useCases/CreateCadete"
import { UpdateCadeteUseCase } from "../../../application/cadetes/useCases/UpdateCadete"
import { DeleteCadeteUseCase } from "../../../application/cadetes/useCases/DeleteCadete"
import { GetCadeteRouteInfoUseCase } from "../../../application/cadetes/useCases/GetCadeteRouteInfo"

export default async function cadeteRoutes(app: FastifyInstance) {
  const repo = new CadetePrismaRepository(app.prisma)
  const controller = new CadeteController(
    new ListCadetesUseCase(repo),
    new GetCadeteByIdUseCase(repo),
    new CreateCadeteUseCase(repo),
    new UpdateCadeteUseCase(repo),
    new DeleteCadeteUseCase(repo),
    new GetCadeteRouteInfoUseCase(repo),
  )

  // Public routes
  app.get("/cadetes", (req, reply) => controller.list(req, reply))
  app.get("/cadetes/:id", (req, reply) => controller.getById(req, reply))
  app.get("/cadete/route/informations/:id", (req, reply) => controller.getRouteInfo(req, reply))

  // Protected routes
  app.post("/cadete", { preHandler: [app.authenticate] }, async (req, reply) => controller.create(req as any, reply))
  app.put("/cadetes/:id", { preHandler: [app.authenticate] }, async (req, reply) => controller.update(req as any, reply))
  app.delete("/cadetes/:id", { preHandler: [app.authenticate] }, async (req, reply) => controller.delete(req as any, reply))
}
