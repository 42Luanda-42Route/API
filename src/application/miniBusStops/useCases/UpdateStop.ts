import { MiniBusStopRepository } from "../../../domain/miniBusStops/MiniBusStopRepository"
import { RouteRepository } from "../../../domain/routes/RouteRepository"
import { MiniBusStop } from "../../../domain/miniBusStops/MiniBusStop"
import { UpdateStopInput } from "../dto"
import { ApplicationError } from "../../errors/ApplicationError"

export class UpdateStopUseCase {
  constructor(private readonly repo: MiniBusStopRepository, private readonly routes: RouteRepository) {}

  async execute(id: number, input: UpdateStopInput): Promise<MiniBusStop> {
    if (!id || Number.isNaN(id)) {
      throw new ApplicationError("O id da paragem deve ser um inteiro positivo.", 422, {
        code: "INVALID_STOP_ID",
        hint: "Use PUT /api/minibusstops/:id com um id numérico.",
      })
    }

    const existing = await this.repo.getById(id)
    if (!existing) {
      throw new ApplicationError(`Paragem #${id} não encontrada. Não é possível atualizar.`, 404, {
        code: "STOP_NOT_FOUND",
        hint: "Liste paragens em GET /api/minibusstops e confirme o id.",
      })
    }

    if (input.route_id) {
      const route = await this.routes.getById(input.route_id)
      if (!route) {
        throw new ApplicationError(
          `A rota #${input.route_id} não existe. Não é possível mover a paragem #${id} para essa rota.`,
          404,
          {
            code: "ROUTE_NOT_FOUND",
            hint: "Liste rotas em GET /api/routes e use um route_id válido.",
          },
        )
      }
    }

    return this.repo.update(id, {
      stopName: input.stop_name !== undefined ? input.stop_name : existing.stopName,
      district: input.district !== undefined ? input.district : existing.district,
      latitude: input.latitude !== undefined ? input.latitude : existing.latitude,
      longitude: input.longitude !== undefined ? input.longitude : existing.longitude,
      description: input.description !== undefined ? input.description : existing.description,
      routeId: input.route_id ?? existing.routeId,
    })
  }
}
