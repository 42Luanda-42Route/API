import { FastifyInstance } from "fastify";
import { AuthController } from "./auth.controller";

export default async function authRoutes(app: FastifyInstance) {
  app.get("/auth/42/login", AuthController.redirectTo42);
  app.get("/auth/42/callback", AuthController.callback42);
  app.post("/auth/42/driver/login", AuthController.loginDriver);
}
