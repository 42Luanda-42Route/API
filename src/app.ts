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
  const app = Fastify({ logger: true })

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
        title: "42RouteAPI-42Luanda",
        version: "1.0.0",
      },
    },
  })

  await app.register(swaggerUI, {
    routePrefix: "/api/docs",
    uiConfig: { docExpansion: "list" },
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

