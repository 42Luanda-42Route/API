import { FastifyInstance, FastifyRequest } from "fastify"
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

  // Public routes
  app.get("/admins", (req, reply) => controller.list(req, reply))
  app.get("/admins/:id", async (req, reply) => controller.getById(req as FastifyRequest<{ Params: { id: string } }>, reply))

  // Protected routes
  app.post("/admin", { preHandler: [app.authenticate] }, async (req, reply) => controller.create(req as any, reply))
  app.put("/admins/:id", { preHandler: [app.authenticate] }, async (req, reply) => controller.update(req as any, reply))
  app.delete("/admins/:id", { preHandler: [app.authenticate] }, async (req, reply) => controller.delete(req as any, reply))
}
