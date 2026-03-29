import Fastify from "fastify";
import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";
import path from "path";
import { readFileSync } from "fs";
import prismaPlugin from "./plugins/prisma";
import adminRoutes from "./interfaces/http/routes/admin.routes";
import cadeteRoutes from "./interfaces/http/routes/cadete.routes";
import driversRoutes from "./interfaces/http/routes/driver.routes";
import authRoutes from "./interfaces/http/routes/auth.routes";
import minibusstopsRoutes from "./interfaces/http/routes/miniBusStops.routes";
import routeRoutes from "./interfaces/http/routes/route.routes";
import { initSocket } from "./WebSockets/socket";
import fastifyJwt from "@fastify/jwt";
import "dotenv/config";



export async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: "*" });

  await app.register(swagger, {
    openapi: {
      info: {
        title: "42RouteAPI-42Luanda",
        version: "1.0.0",
      },
    },
  });

  await app.register(swaggerUI, {
    routePrefix: "/api/docs",
    uiConfig: { docExpansion: "list" },
  });

  const prismaSchemaPath = path.resolve(process.cwd(), "schemas","json-schema.json");
  const prismaSchemas = JSON.parse(readFileSync(prismaSchemaPath, "utf-8"));

  function fixRefs(schema: any) {
    if (schema && typeof schema === "object") {
      for (const key in schema) {
        const value = schema[key];
        if (key === "$ref" && typeof value === "string") {
          schema[key] = value.replace("#/definitions/", "") + "#";
        } else if (typeof value === "object") {
          fixRefs(value);
        }
      }
    }
  }

  const sensitiveFields = ["password", "passwrd", "token", "refreshToken"];

  Object.entries(prismaSchemas.definitions).forEach(([name, schema]: any) => {
    fixRefs(schema);

    if (schema.properties) {
      sensitiveFields.forEach((field) => {
        if (schema.properties[field]) {
          delete schema.properties[field];
        }
      });
    }

    app.addSchema({
      $id: name,
      ...(schema as Record<string, any>),
    });
  });

  await app.register(prismaPlugin);

  initSocket(app);
  
  app.register(fastifyJwt, {
    secret: process.env.JWT_SECRET as string,
    sign: { expiresIn: process.env.JWT_EXPIRES || "1h" },
  });
  app.register(authRoutes, { prefix: "/api"});
  app.register(routeRoutes, { prefix: "/api" });
  app.register(adminRoutes, { prefix: "/api" });
  app.register(cadeteRoutes, { prefix: "/api" });
  app.register(driversRoutes, { prefix: "/api" });
  app.register(minibusstopsRoutes, { prefix: "/api" });

  return app;
}
