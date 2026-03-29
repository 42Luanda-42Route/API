import { MiniBusStopRepository } from "../../../domain/miniBusStops/MiniBusStopRepository"
import { RouteRepository } from "../../../domain/routes/RouteRepository"
import { MiniBusStop } from "../../../domain/miniBusStops/MiniBusStop"
import { UpdateStopInput } from "../dto"
import { ApplicationError } from "../../errors/ApplicationError"

export class UpdateStopUseCase {
  constructor(private readonly repo: MiniBusStopRepository, private readonly routes: RouteRepository) {}

  async execute(id: number, input: UpdateStopInput): Promise<MiniBusStop> {
    if (!id || Number.isNaN(id)) {
      throw new ApplicationError("Stop id must be valid", 422)
    }

    const existing = await this.repo.getById(id)
    if (!existing) {
      throw new ApplicationError("Bus stop not found", 404)
    }

    if (input.route_id) {
      const route = await this.routes.getById(input.route_id)
      if (!route) {
        throw new ApplicationError("Route not found", 404)
      }
    }

    return this.repo.update(id, {
      stopName: input.stop_name ?? existing.stopName,
      distrit: input.distrit ?? existing.distrit,
      latitude: input.latitude ?? existing.latitude,
      longitude: input.longitude ?? existing.longitude,
      description: input.description ?? existing.description,
      routeId: input.route_id ?? existing.routeId,
    })
  }
}
