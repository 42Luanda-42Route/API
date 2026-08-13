import { PrismaClient } from "@prisma/client"
import { MiniBusStopRepository } from "../../domain/miniBusStops/MiniBusStopRepository"
import { MiniBusStop } from "../../domain/miniBusStops/MiniBusStop"
import { handlePrismaError } from "../errors/PrismaErrorHandler"

export class MiniBusStopPrismaRepository implements MiniBusStopRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(page = 1, limit = 20): Promise<{ data: MiniBusStop[]; total: number }> {
    const [stops, total] = await Promise.all([
      this.prisma.miniBusStop.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { id: "asc" },
      }),
      this.prisma.miniBusStop.count(),
    ])
    return { data: stops.map((s: any) => this.map(s)), total }
  }

  async getById(id: number): Promise<MiniBusStop | null> {
    const stop = await this.prisma.miniBusStop.findUnique({ where: { id } })
    return stop ? this.map(stop) : null
  }

  async create(data: Partial<MiniBusStop>): Promise<MiniBusStop> {
    try {
      const stop = await this.prisma.miniBusStop.create({
        data: {
          stop_name: data.stopName ?? null,
          district: data.district ?? null,
          latitude: data.latitude ?? null,
          longitude: data.longitude ?? null,
          description: data.description ?? null,
          route_id: data.routeId!,
        },
      })
      return this.map(stop)
    } catch (error) {
      handlePrismaError(error)
    }
  }

  async update(id: number, data: Partial<MiniBusStop>): Promise<MiniBusStop> {
    try {
      const stop = await this.prisma.miniBusStop.update({
        where: { id },
        data: {
          stop_name: data.stopName,
          district: data.district,
          latitude: data.latitude,
          longitude: data.longitude,
          description: data.description,
          route_id: data.routeId,
        },
      })
      return this.map(stop)
    } catch (error) {
      handlePrismaError(error)
    }
  }

  async delete(id: number): Promise<void> {
    try {
      await this.prisma.miniBusStop.delete({ where: { id } })
    } catch (error) {
      handlePrismaError(error)
    }
  }

  private map(stop: any): MiniBusStop {
    return {
      id: stop.id,
      stopName: stop.stop_name,
      district: stop.district,
      latitude: stop.latitude,
      longitude: stop.longitude,
      description: stop.description,
      routeId: stop.route_id,
      createdAt: stop.createdAt,
    }
  }
}
