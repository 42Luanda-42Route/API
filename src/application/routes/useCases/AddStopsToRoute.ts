import { RouteRepository } from "../../../domain/routes/RouteRepository"
import { RouteWithRelations } from "../../../domain/routes/Route"
import { AddStopsInput } from "../dto"
import { ApplicationError } from "../../errors/ApplicationError"

export class AddStopsToRouteUseCase {
  constructor(private readonly routeRepository: RouteRepository) {}

  async execute(input: AddStopsInput): Promise<RouteWithRelations> {
    if (!input.routeId || Number.isNaN(input.routeId)) {
      throw new ApplicationError("routeId must be a valid number", 422)
    }
    if (!input.stopIds?.length) {
      throw new ApplicationError("At least one stopId is required", 422)
    }

    const route = await this.routeRepository.addStops(input.routeId, input.stopIds)
    if (!route) {
      throw new ApplicationError("Route not found", 404)
    }

    return route
  }
}
