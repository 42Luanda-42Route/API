import { FastifyInstance } from "fastify"
import {
  CreateTripBoardingRequestUseCase,
  DecideBoardingRequestUseCase,
  ListMyBoardingRequestsUseCase,
  ListTripBoardingRequestsUseCase,
} from "../../../application/boarding/useCases/TripBoardingUseCases"
import {
  CancelTripUseCase,
  CompleteTripUseCase,
  CreateTripUseCase,
  DeleteTripUseCase,
  GetActiveTripUseCase,
  GetTripByIdUseCase,
  ListTripsUseCase,
  UpdateTripUseCase,
} from "../../../application/trips/useCases/TripUseCases"
import { BoardingRequestPrismaRepository } from "../../../infrastructure/repositories/BoardingRequestPrismaRepository"
import { CadetePrismaRepository } from "../../../infrastructure/repositories/CadetePrismaRepository"
import { DriverPrismaRepository } from "../../../infrastructure/repositories/DriverPrismaRepository"
import { TripPrismaRepository } from "../../../infrastructure/repositories/TripPrismaRepository"
import { BoardingRequestController } from "../controllers/BoardingRequestController"
import { TripController } from "../controllers/TripController"

const authSchema = { security: [{ bearerAuth: [] }] }
const idParams = {
  type: "object",
  required: ["id"],
  properties: { id: { type: "integer", minimum: 1 } },
}
const tripIdParams = {
  type: "object",
  required: ["tripId"],
  properties: { tripId: { type: "integer", minimum: 1 } },
}
const vehicleProperties = {
  vehicle_name: { type: "string", minLength: 2, maxLength: 80 },
  vehicle_plate: { type: "string", minLength: 3, maxLength: 20 },
  vehicle_capacity: { type: "integer", minimum: 1, maximum: 200 },
}

export default async function tripRoutes(app: FastifyInstance) {
  const trips = new TripPrismaRepository(app.prisma)
  const drivers = new DriverPrismaRepository(app.prisma)
  const cadetes = new CadetePrismaRepository(app.prisma)
  const requests = new BoardingRequestPrismaRepository(app.prisma)

  const tripController = new TripController(
    new CreateTripUseCase(drivers, trips),
    new GetActiveTripUseCase(cadetes, trips, requests),
    new ListTripsUseCase(trips),
    new GetTripByIdUseCase(cadetes, trips),
    new UpdateTripUseCase(trips),
    new CompleteTripUseCase(trips),
    new CancelTripUseCase(trips),
    new DeleteTripUseCase(trips),
  )
  const boardingController = new BoardingRequestController(
    new CreateTripBoardingRequestUseCase(requests),
    new ListMyBoardingRequestsUseCase(requests),
    new ListTripBoardingRequestsUseCase(trips, requests),
    new DecideBoardingRequestUseCase(requests),
  )

  app.get(
    "/trips/active",
    {
      preHandler: [app.authenticate],
      schema: {
        ...authSchema,
        tags: ["Trips"],
        summary: "Obter a viagem ativa do motorista ou da rota do cadete",
      },
    },
    (req, reply) => tripController.active(req, reply),
  )

  app.get(
    "/trips/active/mine",
    {
      preHandler: [app.authenticate],
      schema: {
        ...authSchema,
        tags: ["Trips"],
        deprecated: true,
        summary: "Alias legado para obter a viagem ativa",
      },
    },
    (req, reply) => tripController.active(req, reply),
  )

  app.get(
    "/trips",
    {
      preHandler: [app.authenticate],
      schema: {
        ...authSchema,
        tags: ["Trips"],
        summary: "Listar viagens com filtros e paginação",
        querystring: {
          type: "object",
          properties: {
            status: { type: "string", enum: ["ACTIVE", "COMPLETED", "CANCELLED"] },
            routeId: { type: "integer", minimum: 1 },
            driverId: { type: "integer", minimum: 1 },
            from: { type: "string" },
            to: { type: "string" },
            dateFrom: { type: "string" },
            dateTo: { type: "string" },
            page: { type: "integer", minimum: 1, default: 1 },
            limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
          },
        },
      },
    },
    (req, reply) => tripController.list(req, reply),
  )

  app.post(
    "/trips",
    {
      preHandler: [app.authenticate],
      schema: {
        ...authSchema,
        tags: ["Trips"],
        summary: "Motorista cria e inicia uma viagem",
        body: {
          type: "object",
          additionalProperties: false,
          required: ["vehicle_name", "vehicle_plate", "vehicle_capacity"],
          properties: vehicleProperties,
        },
      },
    },
    (req, reply) => tripController.create(req, reply),
  )

  app.get(
    "/trips/:id",
    {
      preHandler: [app.authenticate],
      schema: {
        ...authSchema,
        tags: ["Trips"],
        summary: "Obter detalhe e ocupação da viagem",
        params: idParams,
      },
    },
    (req, reply) => tripController.getById(req, reply),
  )

  app.patch(
    "/trips/:id",
    {
      preHandler: [app.authenticate],
      schema: {
        ...authSchema,
        tags: ["Trips"],
        summary: "Editar dados da viatura da viagem (admin)",
        params: idParams,
        body: {
          type: "object",
          minProperties: 1,
          additionalProperties: false,
          properties: vehicleProperties,
        },
      },
    },
    (req, reply) => tripController.update(req, reply),
  )

  app.post(
    "/trips/:id/complete",
    {
      preHandler: [app.authenticate],
      schema: {
        ...authSchema,
        tags: ["Trips"],
        summary: "Concluir viagem ativa e rejeitar pedidos pendentes",
        params: idParams,
      },
    },
    (req, reply) => tripController.complete(req, reply),
  )

  app.post(
    "/trips/:id/cancel",
    {
      preHandler: [app.authenticate],
      schema: {
        ...authSchema,
        tags: ["Trips"],
        summary: "Cancelar viagem ativa (admin)",
        params: idParams,
      },
    },
    (req, reply) => tripController.cancel(req, reply),
  )

  app.delete(
    "/trips/:id",
    {
      preHandler: [app.authenticate],
      schema: {
        ...authSchema,
        tags: ["Trips"],
        summary: "Apagar viagem já encerrada (admin)",
        params: idParams,
      },
    },
    (req, reply) => tripController.delete(req, reply),
  )

  app.post(
    "/trips/:tripId/boarding-requests",
    {
      preHandler: [app.authenticate],
      schema: {
        ...authSchema,
        tags: ["Boarding"],
        summary: "Cadete solicita embarque sem QR",
        params: tripIdParams,
      },
    },
    (req, reply) => boardingController.create(req, reply),
  )

  app.get(
    "/boarding-requests/mine",
    {
      preHandler: [app.authenticate],
      schema: {
        ...authSchema,
        tags: ["Boarding"],
        summary: "Cadete restaura o estado dos próprios pedidos",
        querystring: {
          type: "object",
          properties: { tripId: { type: "integer", minimum: 1 } },
        },
      },
    },
    (req, reply) => boardingController.mine(req, reply),
  )

  app.get(
    "/trips/:tripId/boarding-requests",
    {
      preHandler: [app.authenticate],
      schema: {
        ...authSchema,
        tags: ["Boarding"],
        summary: "Listar pedidos de embarque da viagem",
        params: tripIdParams,
        querystring: {
          type: "object",
          properties: {
            status: {
              type: "string",
              enum: ["PENDING", "APPROVED", "REJECTED"],
            },
          },
        },
      },
    },
    (req, reply) => boardingController.forTrip(req, reply),
  )

  app.patch(
    "/boarding-requests/:id",
    {
      preHandler: [app.authenticate],
      schema: {
        ...authSchema,
        tags: ["Boarding"],
        summary: "Motorista ou admin aprova/rejeita pedido",
        params: idParams,
        body: {
          type: "object",
          additionalProperties: false,
          required: ["status"],
          properties: {
            status: {
              type: "string",
              enum: ["APPROVED", "REJECTED"],
            },
          },
        },
      },
    },
    (req, reply) => boardingController.update(req, reply),
  )
}
