import { RouteRepository } from "../../../domain/routes/RouteRepository"
import { RouteWithRelations } from "../../../domain/routes/Route"
import { AddStopsInput } from "../dto"
import { ApplicationError } from "../../errors/ApplicationError"

export class AddStopsToRouteUseCase {
  constructor(private readonly routeRepository: RouteRepository) {}

  async execute(input: AddStopsInput): Promise<RouteWithRelations> {
    if (!input.routeId || Number.isNaN(input.routeId)) {
      throw new ApplicationError("O routeId deve ser um inteiro positivo.", 422, {
        code: "INVALID_ROUTE_ID",
        hint: "Use POST /api/routes/:id/stops com um id de rota válido.",
      })
    }
    if (!input.stopIds?.length) {
      throw new ApplicationError("É necessário enviar pelo menos um stopId.", 422, {
        code: "STOP_IDS_REQUIRED",
        hint: "Envie { \"stopIds\": [1, 2] } com ids de paragens existentes.",
      })
    }

    const route = await this.routeRepository.addStops(input.routeId, input.stopIds)
    if (!route) {
      throw new ApplicationError(`Rota #${input.routeId} não encontrada. Não é possível associar paragens.`, 404, {
        code: "ROUTE_NOT_FOUND",
        hint: "Liste rotas em GET /api/routes e confirme o id.",
      })
    }

    return route
  }
}
