import { FastifyInstance } from "fastify"
import { AdminPrismaRepository } from "../../../infrastructure/repositories/AdminPrismaRepository"
import { AdminController } from "../controllers/AdminController"
import { CreateAdminUseCase } from "../../../application/admins/useCases/CreateAdmin"
import { ListAdminsUseCase } from "../../../application/admins/useCases/ListAdmins"
import { GetAdminByIdUseCase } from "../../../application/admins/useCases/GetAdminById"
import { UpdateAdminUseCase } from "../../../application/admins/useCases/UpdateAdmin"
import { DeleteAdminUseCase } from "../../../application/admins/useCases/DeleteAdmin"
import { LoginAdminUseCase } from "../../../application/admins/useCases/LoginAdmin"

export default async function adminRoutes(app: FastifyInstance) {
  const repo = new AdminPrismaRepository(app.prisma)
  const controller = new AdminController(
    new CreateAdminUseCase(repo),
    new ListAdminsUseCase(repo),
    new GetAdminByIdUseCase(repo),
    new UpdateAdminUseCase(repo),
    new DeleteAdminUseCase(repo),
    new LoginAdminUseCase(repo),
  )

  app.get("/admins", (req, reply) => controller.list(req, reply))
  app.get("/admins/:id", (req, reply) => controller.getById(req, reply))
  app.post("/admin", (req, reply) => controller.create(req, reply))
  app.put("/admins/:id", (req, reply) => controller.update(req, reply))
  app.delete("/admins/:id", (req, reply) => controller.delete(req, reply))
}
