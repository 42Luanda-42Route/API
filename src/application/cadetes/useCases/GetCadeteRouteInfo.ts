import { CadeteRepository } from "../../../domain/cadetes/CadeteRepository"
import { ApplicationError } from "../../errors/ApplicationError"

export class GetCadeteRouteInfoUseCase {
  constructor(private readonly repo: CadeteRepository) {}

  async execute(id: number) {
    if (!id || Number.isNaN(id)) {
      throw new ApplicationError("Cadete id must be valid", 422)
    }

    const routeInfo = await this.repo.getRouteInfo(id)
    if (!routeInfo) {
      throw new ApplicationError("Cadete não encontrado ou sem rota associada", 404)
    }

    return routeInfo
  }
}
