import { DriverRepository } from "../../../domain/drivers/DriverRepository"
import { ApplicationError } from "../../errors/ApplicationError"

export class DeleteDriverUseCase {
  constructor(private readonly repo: DriverRepository) {}

  async execute(id: number): Promise<void> {
    if (!id || Number.isNaN(id)) {
      throw new ApplicationError("O id do motorista deve ser um inteiro positivo.", 422, {
        code: "INVALID_DRIVER_ID",
        hint: "Use um id numérico no URL, por exemplo DELETE /api/drivers/3.",
      })
    }

    const existing = await this.repo.getById(id)
    if (!existing) {
      throw new ApplicationError(`Motorista #${id} não encontrado. Não é possível apagar.`, 404, {
        code: "DRIVER_NOT_FOUND",
        hint: "Liste os motoristas em GET /api/drivers e confirme o id.",
      })
    }

    await this.repo.delete(id)
  }
}
