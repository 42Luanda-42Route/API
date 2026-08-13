import { DriverRepository } from "../../../domain/drivers/DriverRepository"
import { DriverCoordinates } from "../../../domain/drivers/Driver"
import { UpdateLocationInput } from "../dto"
import { ApplicationError } from "../../errors/ApplicationError"

export class UpdateDriverLocationUseCase {
  constructor(private readonly repo: DriverRepository) {}

  async execute(input: UpdateLocationInput): Promise<DriverCoordinates> {
    if (!input.driverId || Number.isNaN(input.driverId)) {
      throw new ApplicationError("Driver id must be valid", 422)
    }

    if (input.lat < -90 || input.lat > 90) {
      throw new ApplicationError("Latitude must be between -90 and 90", 422)
    }

    if (input.long < -180 || input.long > 180) {
      throw new ApplicationError("Longitude must be between -180 and 180", 422)
    }

    return this.repo.updateLocation(input.driverId, { lat: input.lat, long: input.long })
  }
}
