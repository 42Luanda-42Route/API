import { MiniBusStopRepository } from "../../../domain/miniBusStops/MiniBusStopRepository"
import { ApplicationError } from "../../errors/ApplicationError"

export class DeleteStopUseCase {
  constructor(private readonly repo: MiniBusStopRepository) {}

  async execute(id: number): Promise<void> {
    if (!id || Number.isNaN(id)) {
      throw new ApplicationError("Stop id must be valid", 422)
    }

    const existing = await this.repo.getById(id)
    if (!existing) {
      throw new ApplicationError("Bus stop not found", 404)
    }

    await this.repo.delete(id)
  }
}
