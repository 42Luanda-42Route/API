import bcrypt from "bcryptjs"
import { AdminRepository } from "../../../domain/admins/AdminRepository"
import { Admin } from "../../../domain/admins/Admin"
import { UpdateAdminInput } from "../dto"
import { ApplicationError } from "../../errors/ApplicationError"

export class UpdateAdminUseCase {
  constructor(private readonly repo: AdminRepository) {}

  async execute(id: number, input: UpdateAdminInput): Promise<Admin> {
    if (!id || Number.isNaN(id)) {
      throw new ApplicationError("Admin id must be valid", 422)
    }

    const existing = await this.repo.getById(id)
    if (!existing) {
      throw new ApplicationError("Admin not found", 404)
    }

    let password: string | null | undefined = input.password
    if (input.password) {
      if (input.password.length < 8) {
        throw new ApplicationError("Password must be at least 8 characters", 422)
      }
      password = await bcrypt.hash(input.password, 10)
    }

    return this.repo.update(id, {
      fullName: input.full_name !== undefined ? input.full_name : existing.fullName,
      username: input.username !== undefined ? input.username : existing.username,
      email: input.email !== undefined ? input.email : existing.email,
      password: password ?? existing.password,
    })
  }
}
