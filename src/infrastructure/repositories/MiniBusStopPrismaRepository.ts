import { PrismaClient } from "@prisma/client"
import { MiniBusStopRepository } from "../../domain/miniBusStops/MiniBusStopRepository"
import { MiniBusStop } from "../../domain/miniBusStops/MiniBusStop"

export class MiniBusStopPrismaRepository implements MiniBusStopRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(): Promise<MiniBusStop[]> {
    const stops = await this.prisma.miniBusStop.findMany()
    return stops.map((s) => this.map(s))
  }

  async getById(id: number): Promise<MiniBusStop | null> {
    const stop = await this.prisma.miniBusStop.findUnique({ where: { id } })
    return stop ? this.map(stop) : null
  }

  async create(data: Partial<MiniBusStop>): Promise<MiniBusStop> {
    const stop = await this.prisma.miniBusStop.create({
      data: {
        stop_name: data.stopName ?? null,
        distrit: data.distrit ?? null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        description: data.description ?? null,
        route_id: data.routeId!,
      },
    })
    return this.map(stop)
  }

  async update(id: number, data: Partial<MiniBusStop>): Promise<MiniBusStop> {
    const stop = await this.prisma.miniBusStop.update({
      where: { id },
      data: {
        stop_name: data.stopName,
        distrit: data.distrit,
        latitude: data.latitude,
        longitude: data.longitude,
        description: data.description,
        route_id: data.routeId,
      },
    })
    return this.map(stop)
  }

  async delete(id: number): Promise<void> {
    await this.prisma.miniBusStop.delete({ where: { id } })
  }

  private map(stop: any): MiniBusStop {
    return {
      id: stop.id,
      stopName: stop.stop_name,
      distrit: stop.distrit,
      latitude: stop.latitude,
      longitude: stop.longitude,
      description: stop.description,
      routeId: stop.route_id,
      createdAt: stop.createdAt,
    }
  }
}
