import Fastify from "fastify"
import cors from "@fastify/cors"
import helmet from "@fastify/helmet"
import rateLimit from "@fastify/rate-limit"
import swagger from "@fastify/swagger"
import swaggerUI from "@fastify/swagger-ui"
import fastifyJwt from "@fastify/jwt"
import path from "path"
import { existsSync, readFileSync } from "fs"
import { env } from "./config/env"
import prismaPlugin from "./plugins/prisma"
import authPlugin from "./plugins/auth"
import adminRoutes from "./interfaces/http/routes/admin.routes"
import cadeteRoutes from "./interfaces/http/routes/cadete.routes"
import driversRoutes from "./interfaces/http/routes/driver.routes"
import authRoutes from "./interfaces/http/routes/auth.routes"
import minibusstopsRoutes from "./interfaces/http/routes/miniBusStops.routes"
import routeRoutes from "./interfaces/http/routes/route.routes"
import healthRoutes from "./interfaces/http/routes/health.routes"

export async function buildApp() {
  const app = Fastify({
    logger: true,
    ajv: {
      customOptions: {
        strict: false,
      },
    },
  })

  const origin = env.CORS_ORIGINS === "*" ? "*" : env.CORS_ORIGINS.split(",").map((o) => o.trim())
  await app.register(cors, { origin })

  await app.register(helmet, {
    contentSecurityPolicy: false,
  })

  await app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
  })

  await app.register(swagger, {
    openapi: {
      info: {
        title: "42RouteAPI - 42 Luanda",
        description:
          "API RESTful para gestão de rotas de transporte, paragens, motoristas e cadetes da 42 Luanda. Suporta rastreamento em tempo real via WebSockets e autenticação OAuth2 (42 Intra) / JWT.",
        version: "1.0.0",
        contact: {
          name: "42 Luanda",
          url: "https://www.42luanda.com",
        },
      },
      servers: [
        {
          url: `http://localhost:${env.PORT}`,
          description: "Servidor Local de Desenvolvimento",
        },
      ],
      tags: [
        { name: "Auth", description: "Autenticação via 42 Intra OAuth e Login de Administradores/Motoristas" },
        { name: "Admins", description: "Gestão de Administradores do Sistema" },
        { name: "Cadetes", description: "Gestão de Cadetes e Informações de Rotas" },
        { name: "Drivers", description: "Gestão de Motoristas, Atribuição de Rotas e Localização" },
        { name: "MiniBusStops", description: "Gestão de Paragens de Minibus/Autocarro" },
        { name: "Routes", description: "Gestão de Rotas de Transporte e Associação de Paragens" },
        { name: "Health", description: "Verificação de Saúde da API e Conectividade com a Base de Dados" },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
            description: "Introduza o JWT token gerado no login (ex: Bearer <token> ou apenas <token>)",
          },
        },
      },
    },
  })

  // Protect Swagger UI documentation with HTTP Basic Authentication
  app.addHook("onRequest", async (req, reply) => {
    if (req.url.startsWith("/api/docs")) {
      const authHeader = req.headers.authorization

      if (!authHeader || !authHeader.startsWith("Basic ")) {
        reply.header("WWW-Authenticate", 'Basic realm="42RouteAPI Documentation"')
        return reply.status(401).send("Authentication required to access API documentation.")
      }

      try {
        const base64Credentials = authHeader.split(" ")[1]
        const decoded = Buffer.from(base64Credentials, "base64").toString("utf-8")
        const [username, password] = decoded.split(":")

        if (username !== env.SWAGGER_USER || password !== env.SWAGGER_PASSWORD) {
          reply.header("WWW-Authenticate", 'Basic realm="42RouteAPI Documentation"')
          return reply.status(401).send("Invalid documentation credentials.")
        }
      } catch {
        reply.header("WWW-Authenticate", 'Basic realm="42RouteAPI Documentation"')
        return reply.status(401).send("Invalid authorization header.")
      }
    }
  })

  await app.register(swaggerUI, {
    routePrefix: "/api/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: true,
      persistAuthorization: true,
      displayRequestDuration: true,
    },
  })

  const prismaSchemaPath = path.resolve(process.cwd(), "schemas", "json-schema.json")
  if (existsSync(prismaSchemaPath)) {
    try {
      const prismaSchemas = JSON.parse(readFileSync(prismaSchemaPath, "utf-8"))

      function fixRefs(schema: any) {
        if (schema && typeof schema === "object") {
          for (const key in schema) {
            const value = schema[key]
            if (key === "$ref" && typeof value === "string") {
              schema[key] = value.replace("#/definitions/", "") + "#"
            } else if (typeof value === "object") {
              fixRefs(value)
            }
          }
        }
      }

      const sensitiveFields = ["password", "token", "refreshToken"]

      if (prismaSchemas.definitions) {
        Object.entries(prismaSchemas.definitions).forEach(([name, schema]: any) => {
          fixRefs(schema)

          if (schema.properties) {
            sensitiveFields.forEach((field) => {
              if (schema.properties[field]) {
                delete schema.properties[field]
              }
            })
          }

          app.addSchema({
            $id: name,
            ...(schema as Record<string, any>),
          })
        })
      }
    } catch {
      // Ignorar erro se o json-schema estiver incompleto
    }
  }

  await app.register(prismaPlugin)

  app.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: env.JWT_EXPIRES || "1h" },
  })

  // Register auth plugin to provide `authenticate` hook
  await app.register(authPlugin)

  app.register(healthRoutes, { prefix: "/api" })
  app.register(authRoutes, { prefix: "/api" })
  app.register(routeRoutes, { prefix: "/api" })
  app.register(adminRoutes, { prefix: "/api" })
  app.register(cadeteRoutes, { prefix: "/api" })
  app.register(driversRoutes, { prefix: "/api" })
  app.register(minibusstopsRoutes, { prefix: "/api" })

  return app
}

