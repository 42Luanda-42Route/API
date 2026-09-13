import { ApplicationError } from "../../errors/ApplicationError"
import { Route } from "../../../domain/routes/Route"
import { RouteRepository } from "../../../domain/routes/RouteRepository"
import { UpdateRouteInput } from "../dto"

export class UpdateRouteUseCase {
  constructor(private readonly routeRepository: RouteRepository) {}

  async execute(id: number, input: UpdateRouteInput): Promise<Route> {
    if (!Number.isInteger(id) || id <= 0) {
      throw new ApplicationError("Route id must be valid", 422)
    }

    if (input.routeName !== undefined && !input.routeName.trim()) {
      throw new ApplicationError("routeName cannot be empty", 422)
    }

    const existing = await this.routeRepository.getById(id)
    if (!existing) {
      throw new ApplicationError("Route not found", 404)
    }

    return this.routeRepository.update(id, {
      routeName: input.routeName?.trim(),
      description: input.description,
    })
  }
}
