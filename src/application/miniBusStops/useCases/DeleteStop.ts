import { MiniBusStopRepository } from "../../../domain/miniBusStops/MiniBusStopRepository"
import { ApplicationError } from "../../errors/ApplicationError"

export class DeleteStopUseCase {
  constructor(private readonly repo: MiniBusStopRepository) {}

  async execute(id: number): Promise<void> {
    if (!id || Number.isNaN(id)) {
      throw new ApplicationError("O id da paragem deve ser um inteiro positivo.", 422, {
        code: "INVALID_STOP_ID",
        hint: "Use DELETE /api/minibusstops/:id com um id numérico.",
      })
    }

    const existing = await this.repo.getById(id)
    if (!existing) {
      throw new ApplicationError(`Paragem #${id} não encontrada. Não é possível apagar.`, 404, {
        code: "STOP_NOT_FOUND",
        hint: "Liste paragens em GET /api/minibusstops e confirme o id.",
      })
    }

    await this.repo.delete(id)
  }
}
