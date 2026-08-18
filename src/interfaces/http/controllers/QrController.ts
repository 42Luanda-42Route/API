import { FastifyReply, FastifyRequest } from "fastify"
import { ScanRouteQrUseCase } from "../../../application/qr/useCases/ScanRouteQr"
import { GenerateBoardingQrUseCase } from "../../../application/qr/useCases/GenerateBoardingQr"
import { ScanBoardingQrUseCase } from "../../../application/qr/useCases/ScanBoardingQr"
import { ApplicationError } from "../../../application/errors/ApplicationError"
import { JWTPayload } from "../../../utils/jwt"

export class QrController {
  constructor(
    private readonly scanRouteQr: ScanRouteQrUseCase,
    private readonly generateBoardingQr: GenerateBoardingQrUseCase,
    private readonly scanBoardingQr: ScanBoardingQrUseCase,
  ) {}

  async scanRoute(req: FastifyRequest<{ Body: { qr: string } }>, reply: FastifyReply) {
    try {
      const user = req.user as JWTPayload
      const result = await this.scanRouteQr.execute({ driverId: Number(user.id), qr: req.body?.qr })
      return reply.send(result)
    } catch (error) {
      return this.handle(error, reply)
    }
  }

  async generateBoarding(req: FastifyRequest, reply: FastifyReply) {
    try {
      const user = req.user as JWTPayload
      const result = await this.generateBoardingQr.execute({ driverId: Number(user.id) })
      return reply.send(result)
    } catch (error) {
      return this.handle(error, reply)
    }
  }

  async scanBoarding(req: FastifyRequest<{ Body: { qr: string } }>, reply: FastifyReply) {
    try {
      const user = req.user as JWTPayload
      const result = await this.scanBoardingQr.execute({ cadeteId: Number(user.id), role: user.role, qr: req.body?.qr })
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
