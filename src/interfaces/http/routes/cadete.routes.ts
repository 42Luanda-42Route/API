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

  app.get("/cadetes", (req, reply) => controller.list(req, reply))
  app.get("/cadetes/:id", (req, reply) => controller.getById(req, reply))
  app.post("/cadete", (req, reply) => controller.create(req, reply))
  app.put("/cadetes/:id", (req, reply) => controller.update(req, reply))
  app.delete("/cadetes/:id", (req, reply) => controller.delete(req, reply))
  app.get("/cadete/route/informations/:id", (req, reply) => controller.getRouteInfo(req, reply))
}
