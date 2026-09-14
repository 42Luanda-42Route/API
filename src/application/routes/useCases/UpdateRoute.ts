import { ApplicationError } from "../../errors/ApplicationError"
import { Route } from "../../../domain/routes/Route"
import { RouteRepository } from "../../../domain/routes/RouteRepository"
import { UpdateRouteInput } from "../dto"

export class UpdateRouteUseCase {
  constructor(private readonly routeRepository: RouteRepository) {}

  async execute(id: number, input: UpdateRouteInput): Promise<Route> {
    if (!Number.isInteger(id) || id <= 0) {
      throw new ApplicationError("O id da rota deve ser um inteiro positivo.", 422, {
        code: "INVALID_ROUTE_ID",
        hint: "Use PUT /api/routes/:id com um id numérico.",
      })
    }

    if (input.routeName !== undefined && !input.routeName.trim()) {
      throw new ApplicationError("O campo routeName não pode ficar vazio.", 422, {
        code: "ROUTE_NAME_REQUIRED",
        hint: "Envie um routeName com pelo menos 1 carácter, ou omita o campo para não o alterar.",
      })
    }

    const existing = await this.routeRepository.getById(id)
    if (!existing) {
      throw new ApplicationError(`Rota #${id} não encontrada. Não é possível atualizar.`, 404, {
        code: "ROUTE_NOT_FOUND",
        hint: "Liste rotas em GET /api/routes e confirme o id.",
      })
    }

    return this.routeRepository.update(id, {
      routeName: input.routeName?.trim(),
      description: input.description,
    })
  }
}
