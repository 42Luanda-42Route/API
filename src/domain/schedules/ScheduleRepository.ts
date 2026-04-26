import { ScheduleWithRoute } from "./Schedule"

export interface ScheduleRepository {
  list(): Promise<ScheduleWithRoute[]>
  listByRoute(routeId: number): Promise<ScheduleWithRoute[]>
}
