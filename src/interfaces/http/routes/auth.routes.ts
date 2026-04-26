import { FastifyInstance, FastifyRequest } from "fastify"
import { AuthController } from "../controllers/AuthController"
import { GenerateAuthUrlUseCase } from "../../../application/auth/useCases/GenerateAuthUrl"
import { Handle42CallbackUseCase } from "../../../application/auth/useCases/Handle42Callback"
import { CadetePrismaRepository } from "../../../infrastructure/repositories/CadetePrismaRepository"
import { LoginDriverUseCase } from "../../../application/drivers/useCases/LoginDriver"
import { LoginAdminUseCase } from "../../../application/admins/useCases/LoginAdmin"
import { DriverPrismaRepository } from "../../../infrastructure/repositories/DriverPrismaRepository"
import { AdminPrismaRepository } from "../../../infrastructure/repositories/AdminPrismaRepository"
import { LoginDriverInput } from "../../../application/drivers/dto"
import { LoginAdminInput } from "../../../application/admins/dto"

export default async function authRoutes(app: FastifyInstance) {
  const cadeteRepo = new CadetePrismaRepository(app.prisma)
  const driverRepo = new DriverPrismaRepository(app.prisma)
  const adminRepo = new AdminPrismaRepository(app.prisma)

  const controller = new AuthController(
    new GenerateAuthUrlUseCase(),
    new Handle42CallbackUseCase(cadeteRepo),
    new LoginDriverUseCase(driverRepo),
    new LoginAdminUseCase(adminRepo),
  )

  app.get("/auth/42/login", (req, reply) => controller.redirectTo42(req, reply))
  app.get("/auth/42/callback", (req, reply) => controller.callback42(req, reply))
  app.post("/auth/42/driver/login", async (req, reply) => controller.loginDriver(req as FastifyRequest<{ Body: LoginDriverInput }>, reply))
  app.post("/auth/42/admin/login", async (req, reply) => controller.loginAdmin(req as FastifyRequest<{ Body: LoginAdminInput }>, reply))
}
