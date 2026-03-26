import { RouteRepository } from "../../../domain/routes/RouteRepository"
import { Route } from "../../../domain/routes/Route"
import { CreateRouteInput } from "../dto"
import { ApplicationError } from "../../errors/ApplicationError"

export class CreateRouteUseCase {
  constructor(private readonly routeRepository: RouteRepository) {}

  async execute(input: CreateRouteInput): Promise<Route> {
    if (!input.routeName?.trim()) {
      throw new ApplicationError("routeName is required", 422)
    }

    return this.routeRepository.create({
      routeName: input.routeName.trim(),
      description: input.description ?? null,
    })
  }
}
