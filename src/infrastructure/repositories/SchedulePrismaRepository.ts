import { PrismaClient, Schedule as PrismaSchedule } from "@prisma/client"
import { ScheduleRepository } from "../../domain/schedules/ScheduleRepository"
import { ScheduleWithRoute } from "../../domain/schedules/Schedule"

export class SchedulePrismaRepository implements ScheduleRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(): Promise<ScheduleWithRoute[]> {
    const schedules = await this.prisma.schedule.findMany({
      where: { is_active: true },
      include: {
        route: { select: { route_name: true } },
      },
      orderBy: [
        { route_id: "asc" },
        { departure_time: "asc" },
      ],
    })

    return schedules.map((s) => this.mapSchedule(s))
  }

  async listByRoute(routeId: number): Promise<ScheduleWithRoute[]> {
    const schedules = await this.prisma.schedule.findMany({
      where: { route_id: routeId, is_active: true },
      include: {
        route: { select: { route_name: true } },
      },
      orderBy: { departure_time: "asc" },
    })

    return schedules.map((s) => this.mapSchedule(s))
  }

  private mapSchedule(
    schedule: PrismaSchedule & { route: { route_name: string } }
  ): ScheduleWithRoute {
    return {
      id: schedule.id,
      routeId: schedule.route_id,
      departureTime: schedule.departure_time,
      arrivalTime: schedule.arrival_time,
      durationMin: schedule.duration_min,
      dayType: schedule.day_type,
      shift: schedule.shift,
      isActive: schedule.is_active,
      createdAt: schedule.createdAt,
      routeName: schedule.route.route_name,
    }
  }
}
