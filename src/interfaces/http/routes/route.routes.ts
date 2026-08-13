import { FastifyInstance } from "fastify"
import { RoutePrismaRepository } from "../../../infrastructure/repositories/RoutePrismaRepository"
import { RouteController } from "../controllers/RouteController"
import { CreateRouteUseCase } from "../../../application/routes/useCases/CreateRoute"
import { AddStopsToRouteUseCase } from "../../../application/routes/useCases/AddStopsToRoute"
import { ListRoutesUseCase } from "../../../application/routes/useCases/ListRoutes"
import { GetRouteByIdUseCase } from "../../../application/routes/useCases/GetRouteById"

export default async function routeRoutes(app: FastifyInstance) {
  const routeRepository = new RoutePrismaRepository(app.prisma)
  const controller = new RouteController(
    new CreateRouteUseCase(routeRepository),
    new AddStopsToRouteUseCase(routeRepository),
    new ListRoutesUseCase(routeRepository),
    new GetRouteByIdUseCase(routeRepository),
  )

  // Public routes
  app.get(
    "/routes",
    {
      schema: {
        tags: ["Routes"],
        summary: "Listar rotas de transporte",
        description: "Retorna a lista paginada de todas as rotas com as suas paragens e motoristas associados.",
        querystring: {
          type: "object",
          properties: {
            page: { type: "integer", default: 1, description: "Número da página" },
            limit: { type: "integer", default: 20, description: "Quantidade por página" },
          },
        },
        response: {
          200: {
            description: "Lista paginada de rotas",
            type: "object",
            properties: {
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "integer", example: 1 },
                    routeName: { type: "string", example: "Rota Kinaxixi - 42 Luanda" },
                    description: { type: "string", nullable: true, example: "Trajeto ligando o Kinaxixi ao Campus da 42" },
                    stops: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "integer", example: 1 },
                          stopName: { type: "string", example: "Paragem Largo do Kinaxixi" },
                          district: { type: "string", example: "Ingombota" },
                          latitude: { type: "number", example: -8.815 },
                          longitude: { type: "number", example: 13.235 },
                        },
                      },
                    },
                    drivers: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "integer", example: 1 },
                          fullName: { type: "string", example: "Manuel António" },
                          phone: { type: "integer", example: 924555666 },
                        },
                      },
                    },
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
    "/routes/:id",
    {
      schema: {
        tags: ["Routes"],
        summary: "Obter rota por ID",
        description: "Retorna os detalhes completos de uma rota incluindo paragens e motoristas vinculados.",
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "integer", description: "ID único da rota", example: 1 },
          },
        },
        response: {
          200: {
            description: "Dados completos da rota",
            type: "object",
            properties: {
              id: { type: "integer", example: 1 },
              routeName: { type: "string", example: "Rota Kinaxixi - 42 Luanda" },
              description: { type: "string", nullable: true, example: "Trajeto ligando o Kinaxixi ao Campus da 42" },
              stops: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "integer", example: 1 },
                    stopName: { type: "string", example: "Paragem Largo do Kinaxixi" },
                    district: { type: "string", example: "Ingombota" },
                    latitude: { type: "number", example: -8.815 },
                    longitude: { type: "number", example: 13.235 },
                  },
                },
              },
              drivers: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "integer", example: 1 },
                    fullName: { type: "string", example: "Manuel António" },
                    phone: { type: "integer", example: 924555666 },
                  },
                },
              },
              createdAt: { type: "string", example: "2026-08-13T20:00:00.000Z" },
            },
          },
          404: {
            description: "Rota não encontrada",
            type: "object",
            properties: {
              error: { type: "string", example: "Route not found" },
            },
          },
        },
      },
    },
    (req, reply) => controller.getById(req as any, reply),
  )

  app.get("/route/:id", { schema: { tags: ["Routes"], deprecated: true } }, (req, reply) => controller.getById(req as any, reply))

  // Protected routes
  app.post(
    "/routes",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["Routes"],
        summary: "Criar nova rota de transporte",
        description: "Regista uma nova rota no sistema. Requer autenticação JWT.",
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["route_name"],
          properties: {
            route_name: { type: "string", minLength: 2, description: "Nome identificador da rota", example: "Rota Talatona - 42 Luanda" },
            description: { type: "string", description: "Descrição do itinerário", example: "Circulação matinal e noturna" },
          },
        },
        response: {
          201: {
            description: "Rota criada com sucesso",
            type: "object",
            properties: {
              id: { type: "integer", example: 3 },
              routeName: { type: "string", example: "Rota Talatona - 42 Luanda" },
              description: { type: "string", nullable: true, example: "Circulação matinal e noturna" },
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
          422: {
            description: "Nome da rota em falta",
            type: "object",
            properties: {
              error: { type: "string", example: "Route name is required" },
            },
          },
        },
      },
    },
    async (req, reply) => controller.create(req as any, reply),
  )

  app.post(
    "/routes/:id/stops",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["Routes"],
        summary: "Adicionar paragens existentes a uma rota",
        description: "Associa uma lista de IDs de paragens a uma rota de transporte. Requer autenticação JWT.",
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "integer", description: "ID da rota", example: 1 },
          },
        },
        body: {
          type: "object",
          required: ["stop_id"],
          properties: {
            stop_id: {
              type: "array",
              items: { type: "integer" },
              description: "Array de IDs das paragens a associar",
              example: [1, 2, 3],
            },
          },
        },
        response: {
          200: {
            description: "Paragens associadas à rota com sucesso",
            type: "object",
            properties: {
              id: { type: "integer", example: 1 },
              routeName: { type: "string", example: "Rota Kinaxixi - 42 Luanda" },
              description: { type: "string", nullable: true },
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
            description: "Rota não encontrada",
            type: "object",
            properties: {
              error: { type: "string", example: "Route not found" },
            },
          },
        },
      },
    },
    async (req, reply) => controller.addStops(req as any, reply),
  )
}
