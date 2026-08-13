import { RouteRepository } from "../../../domain/routes/RouteRepository"
import { RouteWithRelations } from "../../../domain/routes/Route"

export class ListRoutesUseCase {
  constructor(private readonly routeRepository: RouteRepository) {}

  async execute(page = 1, limit = 20): Promise<{ data: RouteWithRelations[]; total: number; page: number; limit: number }> {
    const result = await this.routeRepository.list(page, limit)
    return {
      data: result.data,
      total: result.total,
      page,
      limit,
    }
  }
}
