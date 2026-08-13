import { FastifyInstance } from "fastify"
import { MiniBusStopPrismaRepository } from "../../../infrastructure/repositories/MiniBusStopPrismaRepository"
import { RoutePrismaRepository } from "../../../infrastructure/repositories/RoutePrismaRepository"
import { MiniBusStopController } from "../controllers/MiniBusStopController"
import { ListStopsUseCase } from "../../../application/miniBusStops/useCases/ListStops"
import { GetStopByIdUseCase } from "../../../application/miniBusStops/useCases/GetStopById"
import { CreateStopUseCase } from "../../../application/miniBusStops/useCases/CreateStop"
import { UpdateStopUseCase } from "../../../application/miniBusStops/useCases/UpdateStop"
import { DeleteStopUseCase } from "../../../application/miniBusStops/useCases/DeleteStop"

export default async function minibusstopsRoutes(app: FastifyInstance) {
  const stopRepo = new MiniBusStopPrismaRepository(app.prisma)
  const routeRepo = new RoutePrismaRepository(app.prisma)
  const controller = new MiniBusStopController(
    new ListStopsUseCase(stopRepo),
    new GetStopByIdUseCase(stopRepo),
    new CreateStopUseCase(stopRepo, routeRepo),
    new UpdateStopUseCase(stopRepo, routeRepo),
    new DeleteStopUseCase(stopRepo),
  )

  // Public routes
  app.get(
    "/minibusstops",
    {
      schema: {
        tags: ["MiniBusStops"],
        summary: "Listar paragens de minibus/autocarro",
        description: "Retorna a lista paginada de todas as paragens cadastradas no sistema.",
        querystring: {
          type: "object",
          properties: {
            page: { type: "integer", default: 1, description: "Número da página" },
            limit: { type: "integer", default: 20, description: "Quantidade por página" },
          },
        },
        response: {
          200: {
            description: "Lista paginada de paragens",
            type: "object",
            properties: {
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "integer", example: 1 },
                    stopName: { type: "string", nullable: true, example: "Paragem Largo do Kinaxixi" },
                    district: { type: "string", nullable: true, example: "Ingombota" },
                    latitude: { type: "number", nullable: true, example: -8.815 },
                    longitude: { type: "number", nullable: true, example: 13.235 },
                    description: { type: "string", nullable: true, example: "Em frente ao BPC" },
                    routeId: { type: "integer", example: 1 },
                    createdAt: { type: "string", example: "2026-08-13T20:00:00.000Z" },
                  },
                },
              },
              total: { type: "integer", example: 1 },
              page: { type: "integer", example: 1 },
              limit: { type: "integer", example: 20 },
            },
          },
        },
      },
    },
    (req, reply) => controller.list(req as any, reply),
  )

  app.get(
    "/minibusstops/:id",
    {
      schema: {
        tags: ["MiniBusStops"],
        summary: "Obter paragem por ID",
        description: "Retorna os detalhes de uma paragem específica pelo seu ID.",
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "integer", description: "ID único da paragem", example: 1 },
          },
        },
        response: {
          200: {
            description: "Dados da paragem",
            type: "object",
            properties: {
              id: { type: "integer", example: 1 },
              stopName: { type: "string", nullable: true, example: "Paragem Largo do Kinaxixi" },
              district: { type: "string", nullable: true, example: "Ingombota" },
              latitude: { type: "number", nullable: true, example: -8.815 },
              longitude: { type: "number", nullable: true, example: 13.235 },
              description: { type: "string", nullable: true, example: "Em frente ao BPC" },
              routeId: { type: "integer", example: 1 },
              createdAt: { type: "string", example: "2026-08-13T20:00:00.000Z" },
            },
          },
          404: {
            description: "Paragem não encontrada",
            type: "object",
            properties: {
              error: { type: "string", example: "Bus stop not found" },
            },
          },
        },
      },
    },
    (req, reply) => controller.getById(req as any, reply),
  )

  app.get("/minibusstop/:id", { schema: { tags: ["MiniBusStops"], deprecated: true } }, (req, reply) => controller.getById(req as any, reply))

  // Protected routes
  app.post(
    "/minibusstops",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["MiniBusStops"],
        summary: "Criar nova paragem",
        description: "Regista uma nova paragem associada a uma rota. Requer autenticação JWT.",
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["route_id"],
          properties: {
            stop_name: { type: "string", example: "Paragem São Paulo" },
            district: { type: "string", example: "Sambizanga" },
            latitude: { type: "number", example: -8.805 },
            longitude: { type: "number", example: 13.245 },
            description: { type: "string", example: "Próximo à feira de São Paulo" },
            route_id: { type: "integer", description: "ID da rota vinculada", example: 1 },
          },
        },
        response: {
          201: {
            description: "Paragem criada com sucesso",
            type: "object",
            properties: {
              id: { type: "integer", example: 2 },
              stopName: { type: "string", nullable: true },
              district: { type: "string", nullable: true },
              latitude: { type: "number", nullable: true },
              longitude: { type: "number", nullable: true },
              description: { type: "string", nullable: true },
              routeId: { type: "integer" },
              createdAt: { type: "string" },
            },
          },
          401: {
            description: "Não autorizado",
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
          404: {
            description: "Rota associada não encontrada",
            type: "object",
            properties: {
              error: { type: "string", example: "Route not found" },
            },
          },
        },
      },
    },
    async (req, reply) => controller.create(req as any, reply),
  )

  app.post("/minibusstop", { preHandler: [app.authenticate], schema: { tags: ["MiniBusStops"], deprecated: true, security: [{ bearerAuth: [] }] } }, async (req, reply) => controller.create(req as any, reply))

  app.put(
    "/minibusstops/:id",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["MiniBusStops"],
        summary: "Atualizar paragem",
        description: "Atualiza os dados de uma paragem existente. Requer autenticação JWT.",
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "integer", description: "ID da paragem", example: 1 },
          },
        },
        body: {
          type: "object",
          properties: {
            stop_name: { type: "string", example: "Paragem Kinaxixi Nova" },
            district: { type: "string", example: "Ingombota" },
            latitude: { type: "number", example: -8.815 },
            longitude: { type: "number", example: 13.235 },
            description: { type: "string", example: "Em frente ao novo edifício" },
            route_id: { type: "integer", example: 2 },
          },
        },
        response: {
          200: {
            description: "Paragem atualizada com sucesso",
            type: "object",
            properties: {
              id: { type: "integer", example: 1 },
              stopName: { type: "string", nullable: true },
              district: { type: "string", nullable: true },
              latitude: { type: "number", nullable: true },
              longitude: { type: "number", nullable: true },
              description: { type: "string", nullable: true },
              routeId: { type: "integer" },
              createdAt: { type: "string" },
            },
          },
          401: {
            description: "Não autorizado",
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
          404: {
            description: "Paragem ou Rota não encontrada",
            type: "object",
            properties: {
              error: { type: "string", example: "Bus stop not found" },
            },
          },
        },
      },
    },
    async (req, reply) => controller.update(req as any, reply),
  )

  app.put("/minibusstop/:id", { preHandler: [app.authenticate], schema: { tags: ["MiniBusStops"], deprecated: true, security: [{ bearerAuth: [] }] } }, async (req, reply) => controller.update(req as any, reply))

  app.delete(
    "/minibusstops/:id",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["MiniBusStops"],
        summary: "Eliminar paragem",
        description: "Remove uma paragem do sistema. Requer autenticação JWT.",
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "integer", description: "ID da paragem", example: 1 },
          },
        },
        response: {
          204: {
            description: "Paragem eliminada com sucesso",
            type: "null",
          },
          401: {
            description: "Não autorizado",
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
          404: {
            description: "Paragem não encontrada",
            type: "object",
            properties: {
              error: { type: "string", example: "Bus stop not found" },
            },
          },
        },
      },
    },
    async (req, reply) => controller.delete(req as any, reply),
  )

  app.delete("/minibusstop/:id", { preHandler: [app.authenticate], schema: { tags: ["MiniBusStops"], deprecated: true, security: [{ bearerAuth: [] }] } }, async (req, reply) => controller.delete(req as any, reply))
}
