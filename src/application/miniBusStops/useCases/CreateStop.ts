import { MiniBusStopRepository } from "../../../domain/miniBusStops/MiniBusStopRepository"
import { RouteRepository } from "../../../domain/routes/RouteRepository"
import { MiniBusStop } from "../../../domain/miniBusStops/MiniBusStop"
import { CreateStopInput } from "../dto"
import { ApplicationError } from "../../errors/ApplicationError"

export class CreateStopUseCase {
  constructor(private readonly repo: MiniBusStopRepository, private readonly routes: RouteRepository) {}

  async execute(input: CreateStopInput): Promise<MiniBusStop> {
    if (!input.route_id || Number.isNaN(input.route_id)) {
      throw new ApplicationError("route_id must be valid", 422)
    }

    const route = await this.routes.getById(input.route_id)
    if (!route) {
      throw new ApplicationError("Route not found", 404)
    }

    return this.repo.create({
      stopName: input.stop_name ?? null,
      distrit: input.distrit ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      description: input.description ?? null,
      routeId: input.route_id,
    })
  }
}
