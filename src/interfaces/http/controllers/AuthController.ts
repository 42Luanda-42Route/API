import { FastifyReply, FastifyRequest } from "fastify"
import { GenerateAuthUrlUseCase } from "../../../application/auth/useCases/GenerateAuthUrl"
import { Handle42CallbackUseCase } from "../../../application/auth/useCases/Handle42Callback"
import { LoginDriverUseCase } from "../../../application/drivers/useCases/LoginDriver"
import { LoginAdminUseCase } from "../../../application/admins/useCases/LoginAdmin"
import { ApplicationError } from "../../../application/errors/ApplicationError"
import { LoginDriverInput } from "../../../application/drivers/dto"
import { LoginAdminInput } from "../../../application/admins/dto"

export class AuthController {
  constructor(
    private readonly generateAuthUrl: GenerateAuthUrlUseCase,
    private readonly handle42Callback: Handle42CallbackUseCase,
    private readonly loginDriverUseCase: LoginDriverUseCase,
    private readonly loginAdminUseCase: LoginAdminUseCase,
  ) {}

  async redirectTo42(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { redirect } = request.query as { redirect: string }
      const url = await this.generateAuthUrl.execute(redirect)
      return reply.redirect(url)
    } catch (error) {
      return this.handle(error, reply)
    }
  }

  async callback42(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { code, state, redirect } = request.query as { code: string; state?: string; redirect?: string }
      const result = await this.handle42Callback.execute(code)
      const targetUrl =
        state && state !== "undefined" && state.trim() !== ""
          ? state
          : redirect && redirect !== "undefined" && redirect.trim() !== ""
            ? redirect
            : undefined

      if (targetUrl) {
        const separator = targetUrl.includes("?") ? "&" : "?"
        return reply.redirect(
          `${targetUrl}${separator}token=${result.token}&isDBUser=${result.isDBUser}&needsOnboarding=${result.needsOnboarding}&hasStop=${result.hasStop}&hasDistrict=${result.hasDistrict}`,
        )
      }

      return reply.send(result)
    } catch (error) {
      return this.handle(error, reply)
    }
  }

  async loginDriver(req: FastifyRequest<{ Body: LoginDriverInput }>, reply: FastifyReply) {
    try {
      const result = await this.loginDriverUseCase.execute(req.body)
      return reply.send(result)
    } catch (error) {
      return this.handle(error, reply)
    }
  }

  async loginAdmin(req: FastifyRequest<{ Body: LoginAdminInput }>, reply: FastifyReply) {
    try {
      const result = await this.loginAdminUseCase.execute(req.body)
      return reply.send(result)
    } catch (error) {
      return this.handle(error, reply)
    }
  }

  private handle(error: unknown, reply: FastifyReply) {
    if (error instanceof ApplicationError) {
      return reply.status(error.statusCode).send({ error: error.message })
    }
    reply.log.error(error)
    return reply.status(500).send({ error: "Internal server error" })
  }
}
