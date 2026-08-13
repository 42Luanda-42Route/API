import { Route, RouteWithRelations } from "./Route"

export interface RouteRepository {
  create(data: { routeName: string; description?: string | null }): Promise<Route>
  addStops(routeId: number, stopIds: number[]): Promise<RouteWithRelations | null>
  list(page?: number, limit?: number): Promise<{ data: RouteWithRelations[]; total: number }>
  getById(id: number): Promise<RouteWithRelations | null>
}
