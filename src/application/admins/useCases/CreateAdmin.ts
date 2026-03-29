import bcrypt from "bcryptjs"
import { AdminRepository } from "../../../domain/admins/AdminRepository"
import { Admin } from "../../../domain/admins/Admin"
import { CreateAdminInput } from "../dto"
import { ApplicationError } from "../../errors/ApplicationError"

export class CreateAdminUseCase {
  constructor(private readonly repo: AdminRepository) {}

  async execute(input: CreateAdminInput): Promise<Admin> {
    if (!input.password || input.password.length < 8) {
      throw new ApplicationError("Password must be at least 8 characters", 422)
    }

    const hashed = await bcrypt.hash(input.password, 10)
    return this.repo.create({
      fullName: input.full_name ?? null,
      username: input.username ?? null,
      email: input.email ?? null,
      password: hashed,
    })
  }
}
