import { ApplicationError } from "../../errors/ApplicationError"
import { RouteRepository } from "../../../domain/routes/RouteRepository"

export class DeleteRouteUseCase {
  constructor(private readonly routeRepository: RouteRepository) {}

  async execute(id: number): Promise<void> {
    if (!Number.isInteger(id) || id <= 0) {
      throw new ApplicationError("Route id must be valid", 422)
    }

    const existing = await this.routeRepository.getById(id)
    if (!existing) {
      throw new ApplicationError("Route not found", 404)
    }

    await this.routeRepository.delete(id)
  }
}
