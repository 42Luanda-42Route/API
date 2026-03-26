import { RouteRepository } from "../../../domain/routes/RouteRepository"
import { RouteWithRelations } from "../../../domain/routes/Route"
import { ApplicationError } from "../../errors/ApplicationError"

export class GetRouteByIdUseCase {
  constructor(private readonly routeRepository: RouteRepository) {}

  async execute(id: number): Promise<RouteWithRelations> {
    if (!id || Number.isNaN(id)) {
      throw new ApplicationError("Route id must be a valid number", 422)
    }

    const route = await this.routeRepository.getById(id)
    if (!route) {
      throw new ApplicationError("Route not found", 404)
    }

    return route
  }
}
