import { RouteRepository } from "../../../domain/routes/RouteRepository"
import { RouteWithRelations } from "../../../domain/routes/Route"

export class ListRoutesUseCase {
  constructor(private readonly routeRepository: RouteRepository) {}

  async execute(): Promise<RouteWithRelations[]> {
    return this.routeRepository.list()
  }
}
