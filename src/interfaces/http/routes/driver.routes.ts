import { FastifyInstance } from "fastify"
import { DriverPrismaRepository } from "../../../infrastructure/repositories/DriverPrismaRepository"
import { RoutePrismaRepository } from "../../../infrastructure/repositories/RoutePrismaRepository"
import { DriverController } from "../controllers/DriverController"
import { ListDriversUseCase } from "../../../application/drivers/useCases/ListDrivers"
import { GetDriverByIdUseCase } from "../../../application/drivers/useCases/GetDriverById"
import { CreateDriverUseCase } from "../../../application/drivers/useCases/CreateDriver"
import { UpdateDriverUseCase } from "../../../application/drivers/useCases/UpdateDriver"
import { DeleteDriverUseCase } from "../../../application/drivers/useCases/DeleteDriver"
import { UpdateDriverLocationUseCase } from "../../../application/drivers/useCases/UpdateDriverLocation"
import { AssignRouteUseCase } from "../../../application/drivers/useCases/AssignRoute"
import { LeaveRouteUseCase } from "../../../application/drivers/useCases/LeaveRoute"
import { LoginDriverUseCase } from "../../../application/drivers/useCases/LoginDriver"

export default async function driverRoutes(app: FastifyInstance) {
  const driverRepo = new DriverPrismaRepository(app.prisma)
  const routeRepo = new RoutePrismaRepository(app.prisma)
  const controller = new DriverController(
    new ListDriversUseCase(driverRepo),
    new GetDriverByIdUseCase(driverRepo),
    new CreateDriverUseCase(driverRepo),
    new UpdateDriverUseCase(driverRepo),
    new DeleteDriverUseCase(driverRepo),
    new UpdateDriverLocationUseCase(driverRepo),
    new AssignRouteUseCase(driverRepo, routeRepo),
    new LeaveRouteUseCase(driverRepo),
    new LoginDriverUseCase(driverRepo),
  )

  app.get(
    "/drivers",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["Drivers"],
        summary: "Listar motoristas",
        security: [{ bearerAuth: [] }],
        description: "Retorna a lista paginada de motoristas cadastrados (sem expor passwords).",
        querystring: {
          type: "object",
          properties: {
            page: { type: "integer", default: 1, description: "Número da página" },
            limit: { type: "integer", default: 20, description: "Quantidade por página" },
          },
        },
        response: {
          200: {
            description: "Lista paginada de motoristas",
            type: "object",
            properties: {
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "integer", example: 1 },
                    fullName: { type: "string", nullable: true, example: "Manuel António" },
                    username: { type: "string", nullable: true, example: "manuel.antonio" },
                    email: { type: "string", nullable: true, example: "manuel@42luanda.com" },
                    photo: { type: "string", nullable: true, example: "https://photos.42luanda.com/driver1.jpg" },
                    phone: { type: "integer", nullable: true, example: 924555666 },
                    currentRouteId: { type: "integer", nullable: true, example: 1 },
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
    "/drivers/:id",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["Drivers"],
        summary: "Obter motorista por ID",
        security: [{ bearerAuth: [] }],
        description: "Retorna os detalhes de um motorista específico pelo seu ID.",
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "integer", description: "ID único do motorista", example: 1 },
          },
        },
        response: {
          200: {
            description: "Dados do motorista",
            type: "object",
            properties: {
              id: { type: "integer", example: 1 },
              fullName: { type: "string", nullable: true, example: "Manuel António" },
              username: { type: "string", nullable: true, example: "manuel.antonio" },
              email: { type: "string", nullable: true, example: "manuel@42luanda.com" },
              photo: { type: "string", nullable: true, example: "https://photos.42luanda.com/driver1.jpg" },
              phone: { type: "integer", nullable: true, example: 924555666 },
              currentRouteId: { type: "integer", nullable: true, example: 1 },
              createdAt: { type: "string", example: "2026-08-13T20:00:00.000Z" },
            },
          },
          404: {
            description: "Motorista não encontrado",
            type: "object",
            properties: {
              error: { type: "string", example: "Driver not found" },
            },
          },
        },
      },
    },
    (req, reply) => controller.getById(req as any, reply),
  )

  app.get("/driver/:id", { schema: { tags: ["Drivers"], deprecated: true } }, (req, reply) => controller.getById(req as any, reply))

  // Protected routes
  app.post(
    "/drivers",
    {
      preHandler: [app.authorizeRoles("ADMIN")],
      schema: {
        tags: ["Drivers"],
        summary: "Criar novo motorista",
        description: "Regista um novo motorista na plataforma. Requer autenticação JWT.",
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["password"],
          properties: {
            full_name: { type: "string", example: "Manuel António" },
            username: { type: "string", example: "manuel.antonio" },
            email: { type: "string", example: "manuel@42luanda.com" },
            password: { type: "string", minLength: 8, example: "senhaSegura123" },
            photo: { type: "string", example: "https://photos.42luanda.com/driver1.jpg" },
            phone: { type: "integer", example: 924555666 },
          },
        },
        response: {
          201: {
            description: "Motorista criado com sucesso",
            type: "object",
            properties: {
              id: { type: "integer", example: 2 },
              fullName: { type: "string", nullable: true },
              username: { type: "string", nullable: true },
              email: { type: "string", nullable: true },
              photo: { type: "string", nullable: true },
              phone: { type: "integer", nullable: true },
              currentRouteId: { type: "integer", nullable: true },
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
            description: "Username ou email já existente",
            type: "object",
            properties: {
              error: { type: "string", example: "Username or email already exists" },
            },
          },
          422: {
            description: "Senha com menos de 8 caracteres ou formato inválido",
            type: "object",
            properties: {
              error: { type: "string", example: "Password must be at least 8 characters" },
            },
          },
        },
      },
    },
    async (req, reply) => controller.create(req as any, reply),
  )

  app.post("/driver", { preHandler: [app.authorizeRoles("ADMIN")], schema: { tags: ["Drivers"], deprecated: true, security: [{ bearerAuth: [] }] } }, async (req, reply) => controller.create(req as any, reply))

  app.put(
    "/drivers/:id",
    {
      preHandler: [app.authorizeSelfOrRoles("DRIVER", ["ADMIN"])],
      schema: {
        tags: ["Drivers"],
        summary: "Atualizar dados do motorista",
        description: "O motorista atualiza o próprio perfil. ADMIN pode atualizar qualquer motorista e a rota.",
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "integer", description: "ID do motorista", example: 1 },
          },
        },
        body: {
          type: "object",
          properties: {
            full_name: { type: "string", example: "Manuel António Jr" },
            username: { type: "string", example: "manuel.jr" },
            email: { type: "string", example: "manuel.jr@42luanda.com" },
            password: { type: "string", minLength: 8, example: "novaSenhaSegura" },
            photo: { type: "string", example: "https://photos.42luanda.com/driver1_new.jpg" },
            phone: { type: "integer", example: 924777888 },
            current_route_id: { type: "integer", nullable: true, example: 2 },
          },
        },
        response: {
          200: {
            description: "Motorista atualizado com sucesso",
            type: "object",
            properties: {
              id: { type: "integer", example: 1 },
              fullName: { type: "string", nullable: true },
              username: { type: "string", nullable: true },
              email: { type: "string", nullable: true },
              photo: { type: "string", nullable: true },
              phone: { type: "integer", nullable: true },
              currentRouteId: { type: "integer", nullable: true },
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
            description: "Motorista não encontrado",
            type: "object",
            properties: {
              error: { type: "string", example: "Driver not found" },
            },
          },
        },
      },
    },
    async (req, reply) => controller.update(req as any, reply),
  )

  app.put("/driver/:id", { preHandler: [app.authorizeSelfOrRoles("DRIVER", ["ADMIN"])], schema: { tags: ["Drivers"], deprecated: true, security: [{ bearerAuth: [] }] } }, async (req, reply) => controller.update(req as any, reply))

  app.delete(
    "/drivers/:id",
    {
      preHandler: [app.authorizeRoles("ADMIN")],
      schema: {
        tags: ["Drivers"],
        summary: "Eliminar motorista",
        description: "Remove o motorista do sistema. Requer autenticação JWT.",
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "integer", description: "ID do motorista", example: 1 },
          },
        },
        response: {
          204: {
            description: "Motorista eliminado com sucesso",
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
            description: "Motorista não encontrado",
            type: "object",
            properties: {
              error: { type: "string", example: "Driver not found" },
            },
          },
        },
      },
    },
    async (req, reply) => controller.delete(req as any, reply),
  )

  app.delete("/driver/:id", { preHandler: [app.authorizeRoles("ADMIN")], schema: { tags: ["Drivers"], deprecated: true, security: [{ bearerAuth: [] }] } }, async (req, reply) => controller.delete(req as any, reply))

  app.put(
    "/drivers/:id/location",
    {
      preHandler: [app.authorizeSelfOrRoles("DRIVER", ["ADMIN"])],
      schema: {
        tags: ["Drivers"],
        summary: "Atualizar localização do motorista (HTTP + WebSocket Broadcast)",
        description: "Atualiza as coordenadas GPS atuais do motorista e envia broadcast via WebSocket para a sala da rota correspondente. Requer autenticação JWT.",
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "integer", description: "ID do motorista", example: 1 },
          },
        },
        body: {
          type: "object",
          required: ["lat", "long"],
          properties: {
            lat: { type: "number", minimum: -90, maximum: 90, description: "Latitude", example: -8.8383 },
            long: { type: "number", minimum: -180, maximum: 180, description: "Longitude", example: 13.2344 },
          },
        },
        response: {
          200: {
            description: "Localização atualizada e coordenadas salvas",
            type: "object",
            properties: {
              id: { type: "integer", example: 1 },
              lat: { type: "number", example: -8.8383 },
              long: { type: "number", example: 13.2344 },
              driverId: { type: "integer", example: 1 },
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
            description: "Coordenadas fora dos limites válidos",
            type: "object",
            properties: {
              error: { type: "string", example: "Latitude must be between -90 and 90" },
            },
          },
        },
      },
    },
    async (req, reply) => controller.updateLocationHandler(req as any, reply),
  )

  app.put("/driver/location/socket/:id", { preHandler: [app.authorizeSelfOrRoles("DRIVER", ["ADMIN"])], schema: { tags: ["Drivers"], deprecated: true, security: [{ bearerAuth: [] }] } }, async (req, reply) => controller.updateLocationHandler(req as any, reply))

  app.post(
    "/drivers/:id/assign-route",
    {
      preHandler: [app.authorizeRoles("ADMIN")],
      schema: {
        tags: ["Drivers"],
        summary: "Atribuir rota a um motorista",
        description: "Associa o motorista a uma rota específica para circulação de transporte. Requer autenticação JWT.",
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "integer", description: "ID do motorista", example: 1 },
          },
        },
        body: {
          type: "object",
          required: ["current_route_id"],
          properties: {
            current_route_id: { type: "integer", description: "ID da rota a atribuir", example: 1 },
          },
        },
        response: {
          200: {
            description: "Rota atribuída com sucesso",
            type: "object",
            properties: {
              id: { type: "integer", example: 1 },
              fullName: { type: "string", nullable: true },
              username: { type: "string", nullable: true },
              email: { type: "string", nullable: true },
              photo: { type: "string", nullable: true },
              phone: { type: "integer", nullable: true },
              currentRouteId: { type: "integer", example: 1 },
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
            description: "Motorista ou Rota não encontrada",
            type: "object",
            properties: {
              error: { type: "string", example: "Route not found" },
            },
          },
        },
      },
    },
    async (req, reply) => controller.assignRouteHandler(req as any, reply),
  )

  app.post("/driver/assign/route/:id", { preHandler: [app.authorizeRoles("ADMIN")], schema: { tags: ["Drivers"], deprecated: true, security: [{ bearerAuth: [] }] } }, async (req, reply) => controller.assignRouteHandler(req as any, reply))

  app.delete(
    "/drivers/:id/leave-route",
    {
      preHandler: [app.authorizeSelfOrRoles("DRIVER", ["ADMIN"])],
      schema: {
        tags: ["Drivers"],
        summary: "Remover motorista da sua rota atual",
        description: "Desvincula o motorista da sua rota ativa e notifica a sala via WebSocket. Requer autenticação JWT.",
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "integer", description: "ID do motorista", example: 1 },
          },
        },
        response: {
          200: {
            description: "Motorista desvinculado da rota",
            type: "object",
            properties: {
              id: { type: "integer", example: 1 },
              fullName: { type: "string", nullable: true },
              currentRouteId: { type: "null" },
            },
          },
          401: {
            description: "Não autorizado",
            type: "object",
            properties: {
              error: { type: "string" },
            },
          },
        },
      },
    },
    async (req, reply) => controller.leaveRouteHandler(req as any, reply),
  )

  app.delete("/driver/leave/route/:id", { preHandler: [app.authorizeSelfOrRoles("DRIVER", ["ADMIN"])], schema: { tags: ["Drivers"], deprecated: true, security: [{ bearerAuth: [] }] } }, async (req, reply) => controller.leaveRouteHandler(req as any, reply))
}
