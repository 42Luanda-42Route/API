import { FastifyInstance } from "fastify"
import { AuthController } from "../controllers/AuthController"
import { GenerateAuthUrlUseCase } from "../../../application/auth/useCases/GenerateAuthUrl"
import { Handle42CallbackUseCase } from "../../../application/auth/useCases/Handle42Callback"
import { CadetePrismaRepository } from "../../../infrastructure/repositories/CadetePrismaRepository"
import { LoginDriverUseCase } from "../../../application/drivers/useCases/LoginDriver"
import { LoginAdminUseCase } from "../../../application/admins/useCases/LoginAdmin"
import { RefreshTokenUseCase } from "../../../application/auth/useCases/RefreshToken"
import { DriverPrismaRepository } from "../../../infrastructure/repositories/DriverPrismaRepository"
import { AdminPrismaRepository } from "../../../infrastructure/repositories/AdminPrismaRepository"

export default async function authRoutes(app: FastifyInstance) {
  const cadeteRepo = new CadetePrismaRepository(app.prisma)
  const driverRepo = new DriverPrismaRepository(app.prisma)
  const adminRepo = new AdminPrismaRepository(app.prisma)

  const controller = new AuthController(
    new GenerateAuthUrlUseCase(),
    new Handle42CallbackUseCase(cadeteRepo),
    new LoginDriverUseCase(driverRepo),
    new LoginAdminUseCase(adminRepo),
    new RefreshTokenUseCase(),
  )

  app.get(
    "/auth/42/login",
    {
      schema: {
        tags: ["Auth"],
        summary: "Iniciar autenticação via 42 Intra OAuth2",
        description: "Gera a URL de autorização da 42 e redireciona o utilizador para o portal da 42 Intra.",
        querystring: {
          type: "object",
          properties: {
            redirect: {
              type: "string",
              description: "URL de retorno para a aplicação frontend",
              example: "http://localhost:3000/callback",
            },
          },
        },
        response: {
          302: {
            description: "Redirecionamento para a página de autorização do 42 Intra",
            type: "null",
          },
        },
      },
    },
    (req, reply) => controller.redirectTo42(req as any, reply),
  )

  app.get("/auth/42", (req, reply) => controller.redirectTo42(req as any, reply))

  app.get(
    "/auth/42/callback",
    {
      schema: {
        tags: ["Auth"],
        summary: "Callback da autenticação 42 Intra",
        description: "Recebe o authorization code do 42 Intra, obtém o perfil do cadete, auto-cadastra se for novo, e retorna o JWT com sinalizadores de onboarding (needsOnboarding, hasDistrict, hasStop).",
        querystring: {
          type: "object",
          required: ["code"],
          properties: {
            code: {
              type: "string",
              description: "Código de autorização retornado pela API da 42 Intra",
              example: "0a1b2c3d4e5f6g7h8i9j",
            },
            state: {
              type: "string",
              description: "URL de redirecionamento frontend opcional",
              example: "http://localhost:3000/callback",
            },
            redirect: {
              type: "string",
              description: "URL de redirecionamento frontend opcional",
              example: "http://localhost:3000/callback",
            },
          },
        },
        response: {
          200: {
            description: "Autenticação bem-sucedida, retorna token JWT e status de onboarding",
            type: "object",
            properties: {
              token: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." },
              refreshToken: { type: "string" },
              user: { type: "object", additionalProperties: true },
              isDBUser: { type: "boolean", example: false, description: "True se o cadete já estiver registado no banco de dados local" },
              needsOnboarding: { type: "boolean", example: true, description: "True se o cadete for novo ou não tiver paragem definida" },
              hasDistrict: { type: "boolean", example: false, description: "True se já tiver distrito associado" },
              hasStop: { type: "boolean", example: false, description: "True se já tiver paragem associada" },
              cadete: {
                type: "object",
                properties: {
                  id: { type: "integer", example: 1 },
                  fullName: { type: "string", nullable: true, example: "Cadete Silva" },
                  username: { type: "string", nullable: true, example: "csilva" },
                  email: { type: "string", nullable: true, example: "csilva@student.42luanda.com" },
                  district: { type: "string", nullable: true, example: null },
                  stopId: { type: "integer", nullable: true, example: null },
                },
              },
            },
          },
          422: {
            description: "Parâmetro code em falta ou inválido",
            type: "object",
            properties: {
              error: { type: "string", example: "code is required" },
            },
          },
          502: {
            description: "Erro ao comunicar com a API da 42 Intra",
            type: "object",
            properties: {
              error: { type: "string", example: "Erro ao buscar perfil no Intra 42" },
            },
          },
        },
      },
    },
    (req, reply) => controller.callback42(req as any, reply),
  )

  app.post(
    "/auth/42/driver/login",
    {
      schema: {
        tags: ["Auth"],
        summary: "Login de Motorista",
        description: "Autentica um motorista utilizando o seu username ou email e password. Retorna um JWT com a role DRIVER.",
        body: {
          type: "object",
          required: ["username", "password"],
          properties: {
            username: {
              type: "string",
              description: "Username ou endereço de email do motorista",
              example: "motorista.silva",
            },
            password: {
              type: "string",
              description: "Password do motorista",
              example: "segredo123",
            },
          },
        },
        response: {
          200: {
            description: "Login bem-sucedido, retorna JWT",
            type: "object",
            properties: {
              token: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." },
              refreshToken: { type: "string" },
              user: {
                type: "object",
                additionalProperties: true,
                properties: {
                  id: { type: "integer" },
                  username: { type: "string", nullable: true },
                  email: { type: "string", nullable: true },
                  fullName: { type: "string", nullable: true },
                  role: { type: "string", example: "DRIVER" },
                },
              },
            },
          },
          401: {
            description: "Credenciais inválidas",
            type: "object",
            additionalProperties: true,
            properties: {
              error: { type: "string", example: "Credenciais inválidas." },
              code: { type: "string", example: "INVALID_CREDENTIALS" },
              hint: { type: "string" },
            },
          },
        },
      },
    },
    (req, reply) => controller.loginDriver(req as any, reply),
  )

  app.post(
    "/auth/42/admin/login",
    {
      schema: {
        tags: ["Auth"],
        summary: "Login de Administrador",
        description: "Autentica um administrador utilizando username ou email e password. Retorna um JWT com a role ADMIN.",
        body: {
          type: "object",
          required: ["username", "password"],
          properties: {
            username: {
              type: "string",
              description: "Username ou email do administrador",
              example: "admin",
            },
            password: {
              type: "string",
              description: "Password do administrador",
              example: "Admin@2026",
            },
          },
        },
        response: {
          200: {
            description: "Login bem-sucedido, retorna JWT",
            type: "object",
            properties: {
              token: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." },
              refreshToken: { type: "string" },
              user: {
                type: "object",
                additionalProperties: true,
                properties: {
                  id: { type: "integer" },
                  username: { type: "string", nullable: true },
                  email: { type: "string", nullable: true },
                  fullName: { type: "string", nullable: true },
                  role: { type: "string", example: "ADMIN" },
                },
              },
            },
          },
          401: {
            description: "Credenciais inválidas",
            type: "object",
            additionalProperties: true,
            properties: {
              error: { type: "string", example: "Credenciais inválidas." },
              code: { type: "string", example: "INVALID_CREDENTIALS" },
              hint: { type: "string" },
            },
          },
        },
      },
    },
    (req, reply) => controller.loginAdmin(req as any, reply),
  )

  app.post(
    "/auth/42/refresh",
    {
      schema: {
        tags: ["Auth"],
        summary: "Renovar Token JWT",
        description: "Valida o token JWT ou refresh token atual e retorna um novo token renovado.",
        body: {
          type: "object",
          properties: {
            token: { type: "string" },
            refreshToken: { type: "string" },
          },
        },
        response: {
          200: {
            description: "Token renovado com sucesso",
            type: "object",
            properties: {
              token: { type: "string" },
              refreshToken: { type: "string" },
              user: { type: "object", additionalProperties: true },
            },
          },
        },
      },
    },
    (req, reply) => controller.refreshToken(req as any, reply),
  )

  app.post(
    "/auth/refresh",
    (req, reply) => controller.refreshToken(req as any, reply),
  )
}

