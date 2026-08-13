import bcrypt from "bcryptjs"
import { AdminRepository } from "../../../domain/admins/AdminRepository"
import { ApplicationError } from "../../errors/ApplicationError"
import { LoginAdminInput } from "../dto"
import { generateToken } from "../../../utils/jwt"

export class LoginAdminUseCase {
  constructor(private readonly repo: AdminRepository) {}

  async execute(input: LoginAdminInput): Promise<{ token: string }> {
    const admin = await this.repo.findByUsernameOrEmail(input.username)
    if (!admin) {
      throw new ApplicationError("Invalid credentials", 401)
    }

    const ok = await bcrypt.compare(input.password, admin.password ?? "")
    if (!ok) {
      throw new ApplicationError("Invalid credentials", 401)
    }

    const jwtToken = generateToken({
      id: admin.id,
      username: admin.username,
      email: admin.email,
      role: "ADMIN",
    })

    return { token: jwtToken }
  }
}
