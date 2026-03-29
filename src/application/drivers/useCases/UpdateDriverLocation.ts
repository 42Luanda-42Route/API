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

    return this.repo.updateLocation(input.driverId, { lat: input.lat, long: input.long })
  }
}
