import { DriverRepository } from "../../../domain/drivers/DriverRepository"
import { RouteRepository } from "../../../domain/routes/RouteRepository"
import { Driver } from "../../../domain/drivers/Driver"
import { ApplicationError } from "../../errors/ApplicationError"
import { AssignRouteInput } from "../dto"

export class AssignRouteUseCase {
  constructor(private readonly drivers: DriverRepository, private readonly routes: RouteRepository) {}

  async execute(input: AssignRouteInput): Promise<Driver> {
    if (!input.driverId || Number.isNaN(input.driverId)) {
      throw new ApplicationError("Driver id must be valid", 422)
    }
    if (!input.current_route_id || Number.isNaN(input.current_route_id)) {
      throw new ApplicationError("route_id must be valid", 422)
    }

    const route = await this.routes.getById(input.current_route_id)
    if (!route) {
      throw new ApplicationError(`route_id: ${input.current_route_id} does not exist`, 404)
    }

    // Ensure uniqueness: if another driver has this route, clear it first
    const existingDriverId = await this.drivers.findDriverIdByRoute(input.current_route_id)
    if (existingDriverId) {
      await this.drivers.leaveRoute(existingDriverId)
    }

    return this.drivers.assignRoute(input.driverId, input.current_route_id)
  }
}
