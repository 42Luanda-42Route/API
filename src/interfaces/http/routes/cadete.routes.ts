import { FastifyInstance } from "fastify"
import { CadetePrismaRepository } from "../../../infrastructure/repositories/CadetePrismaRepository"
import { CadeteController } from "../controllers/CadeteController"
import { ListCadetesUseCase } from "../../../application/cadetes/useCases/ListCadetes"
import { GetCadeteByIdUseCase } from "../../../application/cadetes/useCases/GetCadeteById"
import { CreateCadeteUseCase } from "../../../application/cadetes/useCases/CreateCadete"
import { UpdateCadeteUseCase } from "../../../application/cadetes/useCases/UpdateCadete"
import { DeleteCadeteUseCase } from "../../../application/cadetes/useCases/DeleteCadete"
import { GetCadeteRouteInfoUseCase } from "../../../application/cadetes/useCases/GetCadeteRouteInfo"

export default async function cadeteRoutes(app: FastifyInstance) {
  const repo = new CadetePrismaRepository(app.prisma)
  const controller = new CadeteController(
    new ListCadetesUseCase(repo),
    new GetCadeteByIdUseCase(repo),
    new CreateCadeteUseCase(repo),
    new UpdateCadeteUseCase(repo),
    new DeleteCadeteUseCase(repo),
    new GetCadeteRouteInfoUseCase(repo),
  )

  // Public routes
  app.get(
    "/cadetes",
    {
      schema: {
        tags: ["Cadetes"],
        summary: "Listar cadetes",
        description: "Retorna a lista paginada de todos os cadetes registrados no sistema.",
        querystring: {
          type: "object",
          properties: {
            page: { type: "integer", default: 1, description: "Número da página" },
            limit: { type: "integer", default: 20, description: "Quantidade por página" },
          },
        },
        response: {
          200: {
            description: "Lista paginada de cadetes",
            type: "object",
            properties: {
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "integer", example: 1 },
                    fullName: { type: "string", nullable: true, example: "Cadete João" },
                    username: { type: "string", nullable: true, example: "jcadete" },
                    email: { type: "string", nullable: true, example: "jcadete@student.42luanda.com" },
                    city: { type: "string", nullable: true, example: "Luanda" },
                    district: { type: "string", nullable: true, example: "Ingombota" },
                    priorityList: { type: "boolean", example: false },
                    phone: { type: "integer", nullable: true, example: 923456789 },
                    stopId: { type: "integer", nullable: true, example: 3 },
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
    "/cadetes/:id",
    {
      schema: {
        tags: ["Cadetes"],
        summary: "Obter cadete por ID",
        description: "Retorna os dados cadastrais de um cadete específico.",
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "integer", description: "ID único do cadete", example: 1 },
          },
        },
        response: {
          200: {
            description: "Dados do cadete",
            type: "object",
            properties: {
              id: { type: "integer", example: 1 },
              fullName: { type: "string", nullable: true, example: "Cadete João" },
              username: { type: "string", nullable: true, example: "jcadete" },
              email: { type: "string", nullable: true, example: "jcadete@student.42luanda.com" },
              city: { type: "string", nullable: true, example: "Luanda" },
              district: { type: "string", nullable: true, example: "Ingombota" },
              priorityList: { type: "boolean", example: false },
              phone: { type: "integer", nullable: true, example: 923456789 },
              stopId: { type: "integer", nullable: true, example: 3 },
              createdAt: { type: "string", example: "2026-08-13T20:00:00.000Z" },
            },
          },
          404: {
            description: "Cadete não encontrado",
            type: "object",
            properties: {
              error: { type: "string", example: "Cadete not found" },
            },
          },
        },
      },
    },
    (req, reply) => controller.getById(req as any, reply),
  )

  app.get(
    "/cadetes/:id/route-info",
    {
      schema: {
        tags: ["Cadetes"],
        summary: "Obter informações de rota do cadete",
        description: "Retorna os detalhes da paragem e da rota atribuída ao cadete, incluindo os motoristas ativos na mesma.",
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "integer", description: "ID do cadete", example: 1 },
          },
        },
        response: {
          200: {
            description: "Informações completas de rota e motoristas para o cadete",
            type: "object",
            properties: {
              full_name: { type: "string", nullable: true, example: "Cadete João" },
              stop: {
                type: "object",
                nullable: true,
                properties: {
                  id: { type: "integer", example: 3 },
                  stop_name: { type: "string", example: "Paragem Largo do Kinaxixi" },
                  district: { type: "string", example: "Ingombota" },
                  latitude: { type: "number", example: -8.815 },
                  longitude: { type: "number", example: 13.235 },
                  route: {
                    type: "object",
                    nullable: true,
                    properties: {
                      id: { type: "integer", example: 1 },
                      route_name: { type: "string", example: "Rota Kinaxixi - 42 Luanda" },
                      description: { type: "string", nullable: true },
                      drivers: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            full_name: { type: "string", nullable: true, example: "Motorista Silva" },
                            phone: { type: "integer", nullable: true, example: 923111222 },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          404: {
            description: "Informações de rota não encontradas",
            type: "object",
            properties: {
              error: { type: "string", example: "Cadete not found" },
            },
          },
        },
      },
    },
    (req, reply) => controller.getRouteInfo(req as any, reply),
  )

  app.get(
    "/cadete/route/informations/:id",
    {
      schema: {
        tags: ["Cadetes"],
        summary: "Obter informações de rota do cadete (legado)",
        deprecated: true,
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "integer", example: 1 },
          },
        },
      },
    },
    (req, reply) => controller.getRouteInfo(req as any, reply),
  )

  // Protected routes
  app.post(
    "/cadetes",
    {
      preHandler: [app.authorizeRoles("ADMIN")],
      schema: {
        tags: ["Cadetes"],
        summary: "Criar novo cadete",
        description: "Regista um novo cadete no sistema. Requer autenticação JWT.",
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          properties: {
            full_name: { type: "string", example: "Ana Maria" },
            username: { type: "string", example: "anamaria" },
            email: { type: "string", example: "anamaria@student.42luanda.com" },
            city: { type: "string", example: "Luanda" },
            district: { type: "string", example: "Maianga" },
            priorityList: { type: "boolean", default: false },
            phone: { type: "integer", example: 923987654 },
            stop_id: { type: "integer", nullable: true, example: 2 },
          },
        },
        response: {
          201: {
            description: "Cadete criado com sucesso",
            type: "object",
            properties: {
              id: { type: "integer", example: 5 },
              fullName: { type: "string", nullable: true },
              username: { type: "string", nullable: true },
              email: { type: "string", nullable: true },
              city: { type: "string", nullable: true },
              district: { type: "string", nullable: true },
              priorityList: { type: "boolean" },
              phone: { type: "integer", nullable: true },
              stopId: { type: "integer", nullable: true },
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
          409: {
            description: "Username ou email já cadastrado",
            type: "object",
            properties: {
              error: { type: "string", example: "Username or email already exists" },
            },
          },
          422: {
            description: "Formato de email inválido",
            type: "object",
            properties: {
              error: { type: "string", example: "Invalid email format" },
            },
          },
        },
      },
    },
    async (req, reply) => controller.create(req as any, reply),
  )

  app.put(
    "/cadetes/:id",
    {
      preHandler: [app.authorizeRoles("ADMIN")],
      schema: {
        tags: ["Cadetes"],
        summary: "Atualizar cadete",
        description: "Atualiza os dados de um cadete existente. Requer autenticação JWT.",
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "integer", description: "ID do cadete", example: 1 },
          },
        },
        body: {
          type: "object",
          properties: {
            full_name: { type: "string", example: "Ana Maria Silva" },
            username: { type: "string", example: "ana.silva" },
            email: { type: "string", example: "ana.silva@student.42luanda.com" },
            city: { type: "string", example: "Luanda" },
            district: { type: "string", example: "Talatona" },
            priorityList: { type: "boolean", example: true },
            phone: { type: "integer", example: 923987654 },
            stop_id: { type: "integer", nullable: true, example: 4 },
          },
        },
        response: {
          200: {
            description: "Cadete atualizado com sucesso",
            type: "object",
            properties: {
              id: { type: "integer", example: 1 },
              fullName: { type: "string", nullable: true },
              username: { type: "string", nullable: true },
              email: { type: "string", nullable: true },
              city: { type: "string", nullable: true },
              district: { type: "string", nullable: true },
              priorityList: { type: "boolean" },
              phone: { type: "integer", nullable: true },
              stopId: { type: "integer", nullable: true },
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
            description: "Cadete não encontrado",
            type: "object",
            properties: {
              error: { type: "string", example: "Cadete not found" },
            },
          },
        },
      },
    },
    async (req, reply) => controller.update(req as any, reply),
  )

  app.delete(
    "/cadetes/:id",
    {
      preHandler: [app.authorizeRoles("ADMIN")],
      schema: {
        tags: ["Cadetes"],
        summary: "Eliminar cadete",
        description: "Remove um cadete do sistema. Requer autenticação JWT.",
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "integer", description: "ID do cadete", example: 1 },
          },
        },
        response: {
          204: {
            description: "Cadete removido com sucesso",
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
            description: "Cadete não encontrado",
            type: "object",
            properties: {
              error: { type: "string", example: "Cadete not found" },
            },
          },
        },
      },
    },
    async (req, reply) => controller.delete(req as any, reply),
  )
}
