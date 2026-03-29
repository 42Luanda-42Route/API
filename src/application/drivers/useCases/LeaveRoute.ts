import { DriverRepository } from "../../../domain/drivers/DriverRepository"
import { Driver } from "../../../domain/drivers/Driver"
import { ApplicationError } from "../../errors/ApplicationError"

export class LeaveRouteUseCase {
  constructor(private readonly repo: DriverRepository) {}

  async execute(driverId: number): Promise<Driver> {
    if (!driverId || Number.isNaN(driverId)) {
      throw new ApplicationError("Driver id must be valid", 422)
    }

    const existing = await this.repo.getById(driverId)
    if (!existing) {
      throw new ApplicationError("Driver not found", 404)
    }

    return this.repo.leaveRoute(driverId)
  }
}
