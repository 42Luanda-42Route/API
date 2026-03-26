import { Drivers, MiniBusStop, Route as PrismaRoute, PrismaClient } from "@prisma/client"
import { RouteRepository } from "../../domain/routes/RouteRepository"
import { DriverSummary, MiniBusStopSummary, Route, RouteWithRelations } from "../../domain/routes/Route"

export class RoutePrismaRepository implements RouteRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: { routeName: string; description?: string | null }): Promise<Route> {
    const route = await this.prisma.route.create({
      data: {
        route_name: data.routeName,
        description: data.description ?? null,
      },
    })

    return this.mapRoute(route)
  }

  async addStops(routeId: number, stopIds: number[]): Promise<RouteWithRelations | null> {
    await this.prisma.miniBusStop.updateMany({
      where: { id: { in: stopIds } },
      data: { route_id: routeId },
    })

    return this.getById(routeId)
  }

  async list(): Promise<RouteWithRelations[]> {
    const routes = await this.prisma.route.findMany({
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
    })

    return routes.map((route) => this.mapRouteWithRelations(route))
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

  private mapRoute(route: PrismaRoute): Route {
    return {
      id: route.id,
      routeName: route.route_name,
      description: route.description ?? null,
      createdAt: route.createdAt,
    }
  }

  private mapStop(stop: MiniBusStop): MiniBusStopSummary {
    return {
      id: stop.id,
      stopName: stop.stop_name,
      distrit: stop.distrit,
      latitude: stop.latitude,
      longitude: stop.longitude,
      description: stop.description,
      routeId: stop.route_id,
    }
  }

  private mapDriver(driver: Pick<Drivers, "id" | "full_name" | "username" | "email" | "phone" | "photo" | "current_route_id">): DriverSummary {
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

  private mapRouteWithRelations(route: PrismaRoute & { stops: MiniBusStop[]; drivers: Array<Pick<Drivers, "id" | "full_name" | "username" | "email" | "phone" | "photo" | "current_route_id">> }): RouteWithRelations {
    return {
      ...this.mapRoute(route),
      stops: route.stops.map((stop) => this.mapStop(stop)),
      drivers: route.drivers.map((driver) => this.mapDriver(driver)),
    }
  }
}
