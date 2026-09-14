import { PrismaClient } from "@prisma/client"
import { RouteRepository } from "../../domain/routes/RouteRepository"
import { DriverSummary, MiniBusStopSummary, Route, RouteWithRelations } from "../../domain/routes/Route"
import { ApplicationError } from "../../application/errors/ApplicationError"
import { handlePrismaError } from "../errors/PrismaErrorHandler"

export class RoutePrismaRepository implements RouteRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: { routeName: string; description?: string | null }): Promise<Route> {
    try {
      const route = await this.prisma.route.create({
        data: {
          route_name: data.routeName,
          description: data.description ?? null,
        },
      })
      return this.mapRoute(route)
    } catch (error) {
      handlePrismaError(error)
    }
  }

  async update(id: number, data: { routeName?: string; description?: string | null }): Promise<Route> {
    try {
      const route = await this.prisma.route.update({
        where: { id },
        data: {
          route_name: data.routeName,
          description: data.description,
        },
      })
      return this.mapRoute(route)
    } catch (error) {
      handlePrismaError(error)
    }
  }

  async delete(id: number): Promise<void> {
    try {
      const activeTrips = await this.prisma.trip.count({
        where: { route_id: id, status: "ACTIVE" },
      })
      if (activeTrips > 0) {
        throw new ApplicationError(
          `Não é possível apagar a rota #${id}: existem ${activeTrips} viagem(ns) ACTIVE nesta rota.`,
          409,
          {
            code: "ROUTE_HAS_ACTIVE_TRIP",
            hint: "Conclua (POST /api/trips/:id/complete) ou cancele (POST /api/trips/:id/cancel) a viagem ativa e volte a apagar a rota.",
          },
        )
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.trip.deleteMany({ where: { route_id: id } })
        await tx.route.delete({ where: { id } })
      })
    } catch (error) {
      if (error instanceof ApplicationError) throw error
      handlePrismaError(error)
    }
  }

  async addStops(routeId: number, stopIds: number[]): Promise<RouteWithRelations | null> {
    await this.prisma.miniBusStop.updateMany({
      where: { id: { in: stopIds } },
      data: { route_id: routeId },
    })

    return this.getById(routeId)
  }

  async list(page = 1, limit = 20): Promise<{ data: RouteWithRelations[]; total: number }> {
    const [routes, total] = await Promise.all([
      this.prisma.route.findMany({
        skip: (page - 1) * limit,
        take: limit,
        include: {
          stops: true,
          drivers: {
            select: {
              id: true,
              full_name: true,
              username: true,
              email: true,
              phone: true,
              photo: true,
              current_route_id: true,
            },
          },
        },
        orderBy: { id: "asc" },
      }),
      this.prisma.route.count(),
    ])
    return { data: routes.map((route: any) => this.mapRouteWithRelations(route)), total }
  }

  async getById(id: number): Promise<RouteWithRelations | null> {
    const route = await this.prisma.route.findUnique({
      where: { id },
      include: {
        stops: true,
        drivers: {
          select: {
            id: true,
            full_name: true,
            username: true,
            email: true,
            phone: true,
            photo: true,
            current_route_id: true,
          },
        },
      },
    })

    return route ? this.mapRouteWithRelations(route) : null
  }

  private mapRoute(route: any): Route {
    return {
      id: route.id,
      routeName: route.route_name,
      description: route.description ?? null,
      createdAt: route.createdAt,
    }
  }

  private mapStop(stop: any): MiniBusStopSummary {
    return {
      id: stop.id,
      stopName: stop.stop_name,
      district: stop.district,
      latitude: stop.latitude,
      longitude: stop.longitude,
      description: stop.description,
      routeId: stop.route_id,
    }
  }

  private mapDriver(driver: any): DriverSummary {
    return {
      id: driver.id,
      fullName: driver.full_name,
      username: driver.username,
      email: driver.email,
      phone: driver.phone,
      photo: driver.photo,
      currentRouteId: driver.current_route_id,
    }
  }

  private mapRouteWithRelations(route: any): RouteWithRelations {
    return {
      ...this.mapRoute(route),
      stops: (route.stops || []).map((stop: any) => this.mapStop(stop)),
      drivers: (route.drivers || []).map((driver: any) => this.mapDriver(driver)),
    }
  }
}
