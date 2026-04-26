import { ScheduleRepository } from "../../domain/schedules/ScheduleRepository"
import { ScheduleWithRoute } from "../../domain/schedules/Schedule"

export class ListSchedulesUseCase {
  constructor(private readonly repo: ScheduleRepository) {}

  async execute(routeId?: number): Promise<ScheduleWithRoute[]> {
    if (routeId) {
      return this.repo.listByRoute(routeId)
    }
    return this.repo.list()
  }
}
