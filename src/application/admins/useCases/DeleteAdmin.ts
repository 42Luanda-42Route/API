import { AdminRepository } from "../../../domain/admins/AdminRepository"
import { ApplicationError } from "../../errors/ApplicationError"

export class DeleteAdminUseCase {
  constructor(private readonly repo: AdminRepository) {}

  async execute(id: number): Promise<void> {
    if (!id || Number.isNaN(id)) {
      throw new ApplicationError("O id do administrador deve ser um inteiro positivo.", 422, {
        code: "INVALID_ADMIN_ID",
        hint: "Use DELETE /api/admins/:id com um id numérico.",
      })
    }

    const existing = await this.repo.getById(id)
    if (!existing) {
      throw new ApplicationError(`Administrador #${id} não encontrado. Não é possível apagar.`, 404, {
        code: "ADMIN_NOT_FOUND",
        hint: "Liste administradores em GET /api/admins e confirme o id.",
      })
    }

    await this.repo.delete(id)
  }
}
