import { MiniBusStopRepository } from "../../../domain/miniBusStops/MiniBusStopRepository"
import { MiniBusStop } from "../../../domain/miniBusStops/MiniBusStop"

export class ListStopsUseCase {
  constructor(private readonly repo: MiniBusStopRepository) {}

  async execute(): Promise<MiniBusStop[]> {
    return this.repo.list()
  }
}
