import { AdminRepository } from "../../../domain/admins/AdminRepository"
import { ApplicationError } from "../../errors/ApplicationError"

export class DeleteAdminUseCase {
  constructor(private readonly repo: AdminRepository) {}

  async execute(id: number): Promise<void> {
    if (!id || Number.isNaN(id)) {
      throw new ApplicationError("Admin id must be valid", 422)
    }

    const existing = await this.repo.getById(id)
    if (!existing) {
      throw new ApplicationError("Admin not found", 404)
    }

    await this.repo.delete(id)
  }
}
