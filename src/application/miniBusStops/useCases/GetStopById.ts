import { MiniBusStopRepository } from "../../../domain/miniBusStops/MiniBusStopRepository"
import { MiniBusStop } from "../../../domain/miniBusStops/MiniBusStop"
import { ApplicationError } from "../../errors/ApplicationError"

export class GetStopByIdUseCase {
  constructor(private readonly repo: MiniBusStopRepository) {}

  async execute(id: number): Promise<MiniBusStop> {
    if (!id || Number.isNaN(id)) {
      throw new ApplicationError("Stop id must be valid", 422)
    }

    const stop = await this.repo.getById(id)
    if (!stop) {
      throw new ApplicationError("Bus stop not found", 404)
    }

    return stop
  }
}
