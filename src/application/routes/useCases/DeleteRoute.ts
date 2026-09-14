import { ApplicationError } from "../../errors/ApplicationError"
import { RouteRepository } from "../../../domain/routes/RouteRepository"

export class DeleteRouteUseCase {
  constructor(private readonly routeRepository: RouteRepository) {}

  async execute(id: number): Promise<void> {
    if (!Number.isInteger(id) || id <= 0) {
      throw new ApplicationError("O id da rota deve ser um inteiro positivo.", 422, {
        code: "INVALID_ROUTE_ID",
        hint: "Use um id numérico no URL, por exemplo DELETE /api/routes/3.",
      })
    }

    const existing = await this.routeRepository.getById(id)
    if (!existing) {
      throw new ApplicationError(`Rota #${id} não encontrada. Não é possível apagar.`, 404, {
        code: "ROUTE_NOT_FOUND",
        hint: "Liste as rotas em GET /api/routes e confirme o id.",
      })
    }

    await this.routeRepository.delete(id)
  }
}
