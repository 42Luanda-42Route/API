import { FastifyInstance } from "fastify"
import { DriverPrismaRepository } from "../../../infrastructure/repositories/DriverPrismaRepository"
import { RoutePrismaRepository } from "../../../infrastructure/repositories/RoutePrismaRepository"
import { CadetePrismaRepository } from "../../../infrastructure/repositories/CadetePrismaRepository"
import { BoardingRequestPrismaRepository } from "../../../infrastructure/repositories/BoardingRequestPrismaRepository"
import { QrController } from "../controllers/QrController"
import { AssignRouteUseCase } from "../../../application/drivers/useCases/AssignRoute"
import { ScanRouteQrUseCase } from "../../../application/qr/useCases/ScanRouteQr"
import { GenerateBoardingQrUseCase } from "../../../application/qr/useCases/GenerateBoardingQr"
import { ScanBoardingQrUseCase } from "../../../application/qr/useCases/ScanBoardingQr"
import { GenerateCadeteQrUseCase } from "../../../application/qr/useCases/GenerateCadeteQr"
import { AdmitCadeteByQrUseCase } from "../../../application/qr/useCases/AdmitCadeteByQr"
import { ListBoardingRequestsUseCase } from "../../../application/qr/useCases/ListBoardingRequests"
import { UpdateBoardingRequestUseCase } from "../../../application/qr/useCases/UpdateBoardingRequest"

export default async function qrRoutes(app: FastifyInstance) {
  const driverRepo = new DriverPrismaRepository(app.prisma)
  const routeRepo = new RoutePrismaRepository(app.prisma)
  const cadeteRepo = new CadetePrismaRepository(app.prisma)
  const boardingRepo = new BoardingRequestPrismaRepository(app.prisma)

  const controller = new QrController(
    new ScanRouteQrUseCase(new AssignRouteUseCase(driverRepo, routeRepo)),
    new GenerateBoardingQrUseCase(driverRepo),
    new ScanBoardingQrUseCase(cadeteRepo, boardingRepo),
    new GenerateCadeteQrUseCase(cadeteRepo),
    new AdmitCadeteByQrUseCase(driverRepo, cadeteRepo, boardingRepo),
    new ListBoardingRequestsUseCase(boardingRepo),
    new UpdateBoardingRequestUseCase(boardingRepo),
  )

  app.post(
    "/qr/route/scan",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["QR"],
        summary: "Motorista escaneia QR de rota",
        description: "Decifra o QR físico (AES-ECB) e associa o motorista autenticado à rota.",
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["qr"],
          properties: { qr: { type: "string", description: "Conteúdo Base64 do QR" } },
        },
        response: {
          200: { description: "Motorista associado à rota", type: "object" },
          401: { type: "object", properties: { error: { type: "string" } } },
          404: { type: "object", properties: { error: { type: "string" } } },
          422: { type: "object", properties: { error: { type: "string" } } },
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
        description: "QR cifrado de curta duração com routeId/driverId para o cadete escanear.",
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: "object",
            properties: {
              qr: { type: "string" },
              expiresAt: { type: "string" },
              routeId: { type: "integer" },
            },
          },
          401: { type: "object", properties: { error: { type: "string" } } },
          409: { type: "object", properties: { error: { type: "string" } } },
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
        summary: "Cadete escaneia QR de embarque",
        description:
          "Valida elegibilidade e cria BoardingRequest PENDING (flagged) para o motorista. Emite boarding:request via socket.",
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["qr"],
          properties: { qr: { type: "string" } },
        },
        response: {
          200: {
            type: "object",
            properties: {
              eligible: { type: "boolean" },
              pending: { type: "boolean" },
              flagged: { type: "boolean" },
              requestId: { type: "integer" },
              reason: { type: "string" },
              cadete: { type: "object" },
              route: { type: "object" },
            },
          },
          403: { type: "object", properties: { error: { type: "string" } } },
          422: { type: "object", properties: { error: { type: "string" } } },
        },
      },
    },
    async (req, reply) => controller.scanBoarding(req as any, reply),
  )

  app.post(
    "/qr/cadete/generate",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["QR"],
        summary: "Cadete gera QR de identificação",
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: "object",
            properties: {
              qr: { type: "string" },
              expiresAt: { type: "string" },
              cadeteId: { type: "integer" },
            },
          },
          403: { type: "object", properties: { error: { type: "string" } } },
        },
      },
    },
    async (req, reply) => controller.generateCadete(req as any, reply),
  )

  app.post(
    "/qr/boarding/admit",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["QR"],
        summary: "Motorista escaneia QR do cadete",
        description:
          "Se elegível, regista BoardingRequest APPROVED na mesma lista (ou aprova PENDING existente) e emite boarding:request:updated.",
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["qr"],
          properties: { qr: { type: "string" } },
        },
        response: {
          200: {
            type: "object",
            properties: {
              admitted: { type: "boolean" },
              pending: { type: "boolean" },
              flagged: { type: "boolean" },
              requestId: { type: "integer" },
              reason: { type: "string" },
              cadete: { type: "object" },
              route: { type: "object" },
              driver: { type: "object" },
            },
          },
          403: { type: "object", properties: { error: { type: "string" } } },
          409: { type: "object", properties: { error: { type: "string" } } },
          422: { type: "object", properties: { error: { type: "string" } } },
        },
      },
    },
    async (req, reply) => controller.admitCadete(req as any, reply),
  )

  app.get(
    "/qr/boarding/requests",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["QR"],
        summary: "Motorista lista pedidos de embarque",
        security: [{ bearerAuth: [] }],
        querystring: {
          type: "object",
          properties: {
            status: { type: "string", enum: ["PENDING", "APPROVED", "REJECTED"] },
          },
        },
        response: {
          200: {
            type: "object",
            properties: { data: { type: "array", items: { type: "object" } } },
          },
          403: { type: "object", properties: { error: { type: "string" } } },
        },
      },
    },
    async (req, reply) => controller.listRequests(req as any, reply),
  )

  app.patch(
    "/qr/boarding/requests/:id",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["QR"],
        summary: "Motorista aprova ou rejeita pedido",
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          required: ["id"],
          properties: { id: { type: "string" } },
        },
        body: {
          type: "object",
          required: ["status"],
          properties: { status: { type: "string", enum: ["APPROVED", "REJECTED"] } },
        },
        response: {
          200: { type: "object" },
          403: { type: "object", properties: { error: { type: "string" } } },
          404: { type: "object", properties: { error: { type: "string" } } },
        },
      },
    },
    async (req, reply) => controller.updateRequest(req as any, reply),
  )
}
