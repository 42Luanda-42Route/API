import { RouteRepository } from "../../../domain/routes/RouteRepository"
import { RouteWithRelations } from "../../../domain/routes/Route"
import { ApplicationError } from "../../errors/ApplicationError"

export class GetRouteByIdUseCase {
  constructor(private readonly routeRepository: RouteRepository) {}

  async execute(id: number): Promise<RouteWithRelations> {
    if (!id || Number.isNaN(id)) {
      throw new ApplicationError("O id da rota deve ser um inteiro positivo.", 422, {
        code: "INVALID_ROUTE_ID",
        hint: "Use GET /api/routes/:id com um id numérico.",
      })
    }

    const route = await this.routeRepository.getById(id)
    if (!route) {
      throw new ApplicationError(`Rota #${id} não encontrada.`, 404, {
        code: "ROUTE_NOT_FOUND",
        hint: "Liste rotas em GET /api/routes e confirme o id.",
      })
    }

    return route
  }
}
