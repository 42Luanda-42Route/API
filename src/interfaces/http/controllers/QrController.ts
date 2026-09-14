import { FastifyReply, FastifyRequest } from "fastify"
import { ScanRouteQrUseCase } from "../../../application/qr/useCases/ScanRouteQr"
import { GenerateBoardingQrUseCase } from "../../../application/qr/useCases/GenerateBoardingQr"
import { ScanBoardingQrUseCase } from "../../../application/qr/useCases/ScanBoardingQr"
import { GenerateCadeteQrUseCase } from "../../../application/qr/useCases/GenerateCadeteQr"
import { AdmitCadeteByQrUseCase } from "../../../application/qr/useCases/AdmitCadeteByQr"
import { ListBoardingRequestsUseCase } from "../../../application/qr/useCases/ListBoardingRequests"
import { UpdateBoardingRequestUseCase } from "../../../application/qr/useCases/UpdateBoardingRequest"
import { ApplicationError } from "../../../application/errors/ApplicationError"
import { JWTPayload } from "../../../utils/jwt"

export class QrController {
  constructor(
    private readonly scanRouteQr: ScanRouteQrUseCase,
    private readonly generateBoardingQr: GenerateBoardingQrUseCase,
    private readonly scanBoardingQr: ScanBoardingQrUseCase,
    private readonly generateCadeteQr: GenerateCadeteQrUseCase,
    private readonly admitCadeteByQr: AdmitCadeteByQrUseCase,
    private readonly listBoardingRequests: ListBoardingRequestsUseCase,
    private readonly updateBoardingRequest: UpdateBoardingRequestUseCase,
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
      const result = await this.scanBoardingQr.execute({
        cadeteId: Number(user.id),
        role: user.role,
        qr: req.body?.qr,
      })
      return reply.send(result)
    } catch (error) {
      return this.handle(error, reply)
    }
  }

  async generateCadete(req: FastifyRequest, reply: FastifyReply) {
    try {
      const user = req.user as JWTPayload
      const result = await this.generateCadeteQr.execute({
        cadeteId: Number(user.id),
        role: user.role,
      })
      return reply.send(result)
    } catch (error) {
      return this.handle(error, reply)
    }
  }

  async admitCadete(req: FastifyRequest<{ Body: { qr: string } }>, reply: FastifyReply) {
    try {
      const user = req.user as JWTPayload
      const result = await this.admitCadeteByQr.execute({
        driverId: Number(user.id),
        role: user.role,
        qr: req.body?.qr,
      })
      return reply.send(result)
    } catch (error) {
      return this.handle(error, reply)
    }
  }

  async listRequests(
    req: FastifyRequest<{ Querystring: { status?: string } }>,
    reply: FastifyReply,
  ) {
    try {
      const user = req.user as JWTPayload
      const status = req.query?.status as "PENDING" | "APPROVED" | "REJECTED" | undefined
      const result = await this.listBoardingRequests.execute({
        driverId: Number(user.id),
        role: user.role,
        status,
      })
      return reply.send({ data: result })
    } catch (error) {
      return this.handle(error, reply)
    }
  }

  async updateRequest(
    req: FastifyRequest<{ Params: { id: string }; Body: { status: "APPROVED" | "REJECTED" } }>,
    reply: FastifyReply,
  ) {
    try {
      const user = req.user as JWTPayload
      const result = await this.updateBoardingRequest.execute({
        driverId: Number(user.id),
        role: user.role,
        requestId: Number(req.params.id),
        status: req.body?.status,
      })
      return reply.send(result)
    } catch (error) {
      return this.handle(error, reply)
    }
  }

  private handle(error: unknown, reply: FastifyReply) {
    if (error instanceof ApplicationError) {
      return reply.status(error.statusCode).send(error.toPayload())
    }
    reply.log.error(error)
    return reply.status(500).send({ error: "Internal server error" })
  }
}
