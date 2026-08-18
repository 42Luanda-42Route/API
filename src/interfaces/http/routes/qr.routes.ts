import { FastifyInstance } from "fastify"
import { DriverPrismaRepository } from "../../../infrastructure/repositories/DriverPrismaRepository"
import { RoutePrismaRepository } from "../../../infrastructure/repositories/RoutePrismaRepository"
import { CadetePrismaRepository } from "../../../infrastructure/repositories/CadetePrismaRepository"
import { QrController } from "../controllers/QrController"
import { AssignRouteUseCase } from "../../../application/drivers/useCases/AssignRoute"
import { ScanRouteQrUseCase } from "../../../application/qr/useCases/ScanRouteQr"
import { GenerateBoardingQrUseCase } from "../../../application/qr/useCases/GenerateBoardingQr"
import { ScanBoardingQrUseCase } from "../../../application/qr/useCases/ScanBoardingQr"

export default async function qrRoutes(app: FastifyInstance) {
  const driverRepo = new DriverPrismaRepository(app.prisma)
  const routeRepo = new RoutePrismaRepository(app.prisma)
  const cadeteRepo = new CadetePrismaRepository(app.prisma)

  const controller = new QrController(
    new ScanRouteQrUseCase(new AssignRouteUseCase(driverRepo, routeRepo)),
    new GenerateBoardingQrUseCase(driverRepo),
    new ScanBoardingQrUseCase(cadeteRepo),
  )

  app.post(
    "/qr/route/scan",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["QR"],
        summary: "Motorista escaneia QR de rota",
        description: "Decifra o QR físico (AES-ECB) já afixado na viatura/paragem e associa o motorista autenticado à rota codificada nele.",
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["qr"],
          properties: {
            qr: { type: "string", description: "Conteúdo bruto (Base64) lido do QR code" },
          },
        },
        response: {
          200: { description: "Motorista associado à rota", type: "object" },
          401: { description: "Não autorizado", type: "object", properties: { error: { type: "string" } } },
          404: { description: "Rota não encontrada", type: "object", properties: { error: { type: "string" } } },
          422: { description: "QR inválido, corrompido ou de tipo incorreto", type: "object", properties: { error: { type: "string" } } },
        },
      },
    },
    async (req, reply) => controller.scanRoute(req as any, reply),
  )

  app.post(
    "/qr/boarding/generate",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["QR"],
        summary: "Motorista gera QR dinâmico de embarque",
        description: "Gera um QR cifrado de curta duração (TTL configurável) com a rota atual do motorista, para exibição em ecrã e validação de presença dos cadetes.",
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: "QR de embarque gerado",
            type: "object",
            properties: {
              qr: { type: "string" },
              expiresAt: { type: "string" },
              routeId: { type: "integer" },
            },
          },
          401: { description: "Não autorizado", type: "object", properties: { error: { type: "string" } } },
          409: { description: "Motorista sem rota atribuída", type: "object", properties: { error: { type: "string" } } },
        },
      },
    },
    async (req, reply) => controller.generateBoarding(req as any, reply),
  )

  app.post(
    "/qr/boarding/scan",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["QR"],
        summary: "Cadete escaneia QR de embarque e valida elegibilidade",
        description: "Decifra o QR dinâmico mostrado pelo motorista e verifica se o cadete autenticado está atribuído à rota correspondente, sem QR expirado.",
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["qr"],
          properties: {
            qr: { type: "string", description: "Conteúdo bruto (Base64) lido do QR code" },
          },
        },
        response: {
          200: {
            description: "Resultado da validação de elegibilidade",
            type: "object",
            properties: {
              eligible: { type: "boolean" },
              reason: { type: "string" },
              cadete: { type: "object" },
              route: { type: "object" },
            },
          },
          401: { description: "Não autorizado", type: "object", properties: { error: { type: "string" } } },
          403: { description: "Utilizador autenticado não é cadete", type: "object", properties: { error: { type: "string" } } },
          422: { description: "QR inválido, corrompido ou de tipo incorreto", type: "object", properties: { error: { type: "string" } } },
        },
      },
    },
    async (req, reply) => controller.scanBoarding(req as any, reply),
  )
}
