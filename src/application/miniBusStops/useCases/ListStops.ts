import { MiniBusStopRepository } from "../../../domain/miniBusStops/MiniBusStopRepository"
import { MiniBusStop } from "../../../domain/miniBusStops/MiniBusStop"

export class ListStopsUseCase {
  constructor(private readonly repo: MiniBusStopRepository) {}

  async execute(page = 1, limit = 20): Promise<{ data: MiniBusStop[]; total: number; page: number; limit: number }> {
    const result = await this.repo.list(page, limit)
    return {
      data: result.data,
      total: result.total,
      page,
      limit,
    }
  }
}
