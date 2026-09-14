import { FastifyInstance } from "fastify"
import { AdminPrismaRepository } from "../../../infrastructure/repositories/AdminPrismaRepository"
import { AdminController } from "../controllers/AdminController"
import { CreateAdminUseCase } from "../../../application/admins/useCases/CreateAdmin"
import { ListAdminsUseCase } from "../../../application/admins/useCases/ListAdmins"
import { GetAdminByIdUseCase } from "../../../application/admins/useCases/GetAdminById"
import { UpdateAdminUseCase } from "../../../application/admins/useCases/UpdateAdmin"
import { DeleteAdminUseCase } from "../../../application/admins/useCases/DeleteAdmin"
import { LoginAdminUseCase } from "../../../application/admins/useCases/LoginAdmin"

export default async function adminRoutes(app: FastifyInstance) {
  const repo = new AdminPrismaRepository(app.prisma)
  const controller = new AdminController(
    new CreateAdminUseCase(repo),
    new ListAdminsUseCase(repo),
    new GetAdminByIdUseCase(repo),
    new UpdateAdminUseCase(repo),
    new DeleteAdminUseCase(repo),
    new LoginAdminUseCase(repo),
  )

  app.get(
    "/admins",
    {
      preHandler: [app.authorizeRoles("ADMIN")],
      schema: {
        tags: ["Admins"],
        summary: "Listar administradores",
        security: [{ bearerAuth: [] }],
        description: "Retorna uma lista paginada de todos os administradores cadastrados no sistema (senhas omitidas).",
        querystring: {
          type: "object",
          properties: {
            page: { type: "integer", default: 1, description: "Número da página" },
            limit: { type: "integer", default: 20, description: "Quantidade de itens por página" },
          },
        },
        response: {
          200: {
            description: "Lista paginada de administradores",
            type: "object",
            properties: {
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "integer", example: 1 },
                    fullName: { type: "string", nullable: true, example: "Super Admin" },
                    username: { type: "string", nullable: true, example: "admin" },
                    email: { type: "string", nullable: true, example: "admin@42luanda.com" },
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
    "/admins/:id",
    {
      preHandler: [app.authorizeRoles("ADMIN")],
      schema: {
        tags: ["Admins"],
        summary: "Obter administrador por ID",
        security: [{ bearerAuth: [] }],
        description: "Retorna os detalhes de um administrador específico pelo seu ID.",
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "integer", description: "ID único do administrador", example: 1 },
          },
        },
        response: {
          200: {
            description: "Dados do administrador encontrado",
            type: "object",
            properties: {
              id: { type: "integer", example: 1 },
              fullName: { type: "string", nullable: true, example: "Super Admin" },
              username: { type: "string", nullable: true, example: "admin" },
              email: { type: "string", nullable: true, example: "admin@42luanda.com" },
              createdAt: { type: "string", example: "2026-08-13T20:00:00.000Z" },
            },
          },
          404: {
            description: "Administrador não encontrado",
            type: "object",
            properties: {
              error: { type: "string", example: "Admin not found" },
            },
          },
        },
      },
    },
    (req, reply) => controller.getById(req as any, reply),
  )

  // Protected routes
  app.post(
    "/admins",
    {
      preHandler: [app.authorizeRoles("ADMIN")],
      schema: {
        tags: ["Admins"],
        summary: "Criar novo administrador",
        description: "Cria um novo administrador no sistema. Requer autenticação JWT válida (Bearer Token).",
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          required: ["password"],
          properties: {
            full_name: { type: "string", description: "Nome completo", example: "Carlos Admin" },
            username: { type: "string", description: "Nome de utilizador único", example: "carlos.admin" },
            email: { type: "string", description: "Email único", example: "carlos@42luanda.com" },
            password: { type: "string", minLength: 8, description: "Senha com mínimo de 8 caracteres", example: "senhaSegura123" },
          },
        },
        response: {
          201: {
            description: "Administrador criado com sucesso",
            type: "object",
            properties: {
              id: { type: "integer", example: 2 },
              fullName: { type: "string", nullable: true, example: "Carlos Admin" },
              username: { type: "string", nullable: true, example: "carlos.admin" },
              email: { type: "string", nullable: true, example: "carlos@42luanda.com" },
              createdAt: { type: "string", example: "2026-08-13T22:00:00.000Z" },
            },
          },
          401: {
            description: "Não autorizado (token em falta ou inválido)",
            type: "object",
            properties: {
              error: { type: "string", example: "Unauthorized" },
              message: { type: "string", example: "Invalid or expired token" },
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
            description: "Dados de entrada inválidos",
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

  app.put(
    "/admins/:id",
    {
      preHandler: [app.authorizeRoles("ADMIN")],
      schema: {
        tags: ["Admins"],
        summary: "Atualizar administrador",
        description: "Atualiza os dados de um administrador existente. Requer autenticação JWT.",
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "integer", description: "ID do administrador", example: 1 },
          },
        },
        body: {
          type: "object",
          properties: {
            full_name: { type: "string", example: "Carlos Silva Atualizado" },
            username: { type: "string", example: "carlos.silva" },
            email: { type: "string", example: "carlos.novo@42luanda.com" },
            password: { type: "string", minLength: 8, example: "novaSenhaSegura123" },
          },
        },
        response: {
          200: {
            description: "Administrador atualizado com sucesso",
            type: "object",
            properties: {
              id: { type: "integer", example: 1 },
              fullName: { type: "string", nullable: true },
              username: { type: "string", nullable: true },
              email: { type: "string", nullable: true },
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
            description: "Administrador não encontrado",
            type: "object",
            properties: {
              error: { type: "string", example: "Admin not found" },
            },
          },
        },
      },
    },
    async (req, reply) => controller.update(req as any, reply),
  )

  app.delete(
    "/admins/:id",
    {
      preHandler: [app.authorizeRoles("ADMIN")],
      schema: {
        tags: ["Admins"],
        summary: "Eliminar administrador",
        description: "Remove um administrador do sistema pelo ID. Requer autenticação JWT.",
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "integer", description: "ID do administrador", example: 1 },
          },
        },
        response: {
          204: {
            description: "Administrador removido com sucesso",
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
            description: "Administrador não encontrado",
            type: "object",
            properties: {
              error: { type: "string", example: "Admin not found" },
            },
          },
        },
      },
    },
    async (req, reply) => controller.delete(req as any, reply),
  )
}
