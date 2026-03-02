import { FastifyInstance } from "fastify";
import routeController from "./route.controller";
import { authenticate } from "../auth/auth.middleware";

async function routeRoutes(app: FastifyInstance) {
  
  //app.addHook("preHandler", authenticate);
  
  app.post("/routes", routeController.createRoute);
  app.post("/routes/:id/stops", routeController.addStops);
  app.get("/routes", routeController.list);
  app.get("/route/:id", routeController.getRouteById);
}

export default routeRoutes;
