import { Route, RouteWithRelations } from "./Route"

export interface RouteRepository {
  create(data: { routeName: string; description?: string | null }): Promise<Route>
  update(id: number, data: { routeName?: string; description?: string | null }): Promise<Route>
  delete(id: number): Promise<void>
  addStops(routeId: number, stopIds: number[]): Promise<RouteWithRelations | null>
  list(page?: number, limit?: number): Promise<{ data: RouteWithRelations[]; total: number }>
  getById(id: number): Promise<RouteWithRelations | null>
}
