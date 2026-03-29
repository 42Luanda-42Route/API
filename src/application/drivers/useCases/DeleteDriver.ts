import { DriverRepository } from "../../../domain/drivers/DriverRepository"
import { ApplicationError } from "../../errors/ApplicationError"

export class DeleteDriverUseCase {
  constructor(private readonly repo: DriverRepository) {}

  async execute(id: number): Promise<void> {
    if (!id || Number.isNaN(id)) {
      throw new ApplicationError("Driver id must be valid", 422)
    }

    const existing = await this.repo.getById(id)
    if (!existing) {
      throw new ApplicationError("Driver not found", 404)
    }

    await this.repo.delete(id)
  }
}
