import { DriverRepository } from "../../../domain/drivers/DriverRepository"
import { Driver } from "../../../domain/drivers/Driver"
import { ApplicationError } from "../../errors/ApplicationError"

export class GetDriverByIdUseCase {
  constructor(private readonly repo: DriverRepository) {}

  async execute(id: number): Promise<Omit<Driver, "passwrd">> {
    if (!id || Number.isNaN(id)) {
      throw new ApplicationError("Driver id must be valid", 422)
    }

    const driver = await this.repo.getById(id)
    if (!driver) {
      throw new ApplicationError("Driver not found", 404)
    }

    const { passwrd, ...rest } = driver
    return rest
  }
}
