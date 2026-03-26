import prisma from "../../infrastructure/database/prismaClient";
import { Routes, RouteStops } from "./route.interface";

export const routeService = {

  async createRoute(data: Routes) {
    return prisma.route.create({
      data: {
        route_name: data.route_name,
        description: data.description,
      }
    });
  },

  async addStopsToRoute(
    routeId: number,
    data: RouteStops
  ) {
    return prisma.route.update({
      where: { id: routeId },
      data: {
        stops: {
          create: data.stop_id.map((stopId, index) => ({
            stop_id: stopId,
            position: stopId + index
          }))
        }
      },
      include: {
        stops: {
          include: {
            route: true
          }
        }
      }
    });
  },

  async listRoutes() {
    return prisma.route.findMany({
      include: {
        stops: {
          include: {
            route: true
          },
        },
        drivers: {
          omit: { passwrd: true }
        },
      }
     
    });
  },

  async getById(id: number)
  {              
      id = Number(id);
      
                       
      return prisma.route.findUnique({
        where: {id: id},
        include:{
          stops:{
            include:{
                route: true
            }
          },
          drivers: {
            omit: { passwrd: true }
          },
        }
      });
  }
};
