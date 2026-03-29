import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { AdminRepository } from "../../../domain/admins/AdminRepository"
import { ApplicationError } from "../../errors/ApplicationError"
import { LoginAdminInput } from "../dto"

export class LoginAdminUseCase {
  constructor(private readonly repo: AdminRepository) {}

  async execute(input: LoginAdminInput): Promise<{ token: string }> {
    const admin = await this.repo.findByUsernameOrEmail(input.username)
    if (!admin) {
      throw new ApplicationError("username or email not found", 404)
    }

    const ok = await bcrypt.compare(input.password, admin.password ?? "")
    if (!ok) {
      throw new ApplicationError("Credenciais erradas", 401)
    }

    const jwtToken = jwt.sign(
      {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: "ADMIN",
      },
      process.env.JWT_SECRET as string,
      { expiresIn: "15m" },
    )

    return { token: jwtToken }
  }
}
