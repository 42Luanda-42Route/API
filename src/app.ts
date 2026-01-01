import Fastify from "fastify";
import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";
import path from "path";
import { readFileSync } from "fs";
import prismaPlugin from "./plugins/prisma";
import adminRoutes from "./modules/admins/admin.routes";
import cadeteRoutes from "./modules/cadetes/cadete.routes";
import driversRoutes from "./modules/drivers/driver.routes";
import authRoutes from "./modules/auth/auth.routes";
import minibusstopsRoutes from "./modules/miniBusStops/miniBusStops.routes";
import routeRoutes from "./modules/routes/route.routes";
import "dotenv/config";

import { initSocket } from "./WebSockets/socket";

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
  
  app.register(authRoutes, { prefix: "/api"});
  app.register(routeRoutes, { prefix: "/api" });
  app.register(adminRoutes, { prefix: "/api" });
  app.register(cadeteRoutes, { prefix: "/api" });
  app.register(driversRoutes, { prefix: "/api" });
  app.register(minibusstopsRoutes, { prefix: "/api" });

  return app;
}
