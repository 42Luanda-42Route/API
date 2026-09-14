import { CadeteRepository } from "../../../domain/cadetes/CadeteRepository"
import { ApplicationError } from "../../errors/ApplicationError"

export class DeleteCadeteUseCase {
  constructor(private readonly repo: CadeteRepository) {}

  async execute(id: number): Promise<void> {
    if (!id || Number.isNaN(id)) {
      throw new ApplicationError("O id do cadete deve ser um inteiro positivo.", 422, {
        code: "INVALID_CADETE_ID",
        hint: "Use DELETE /api/cadetes/:id com um id numérico.",
      })
    }

    const existing = await this.repo.getById(id)
    if (!existing) {
      throw new ApplicationError(`Cadete #${id} não encontrado. Não é possível apagar.`, 404, {
        code: "CADETE_NOT_FOUND",
        hint: "Liste cadetes em GET /api/cadetes e confirme o id.",
      })
    }

    await this.repo.delete(id)
  }
}
