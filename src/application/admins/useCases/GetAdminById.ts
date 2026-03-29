import { AdminRepository } from "../../../domain/admins/AdminRepository"
import { Admin } from "../../../domain/admins/Admin"
import { ApplicationError } from "../../errors/ApplicationError"

export class GetAdminByIdUseCase {
  constructor(private readonly repo: AdminRepository) {}

  async execute(id: number): Promise<Omit<Admin, "password">> {
    if (!id || Number.isNaN(id)) {
      throw new ApplicationError("Admin id must be valid", 422)
    }

    const admin = await this.repo.getById(id)
    if (!admin) {
      throw new ApplicationError("Admin not found", 404)
    }

    const { password, ...rest } = admin
    return rest
  }
}
