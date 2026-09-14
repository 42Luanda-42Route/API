import bcrypt from "bcryptjs"
import { AdminRepository } from "../../../domain/admins/AdminRepository"
import { ApplicationError } from "../../errors/ApplicationError"
import { LoginAdminInput } from "../dto"
import { issueAuthTokens } from "../../../utils/jwt"

export class LoginAdminUseCase {
  constructor(private readonly repo: AdminRepository) {}

  async execute(input: LoginAdminInput) {
    const admin = await this.repo.findByUsernameOrEmail(input.username)
    if (!admin) {
      throw new ApplicationError("Credenciais inválidas.", 401, {
        code: "INVALID_CREDENTIALS",
        hint: "Confirme username e password em POST /api/auth/42/admin/login. Por segurança não indicamos se a conta existe.",
      })
    }

    const ok = await bcrypt.compare(input.password, admin.password ?? "")
    if (!ok) {
      throw new ApplicationError("Credenciais inválidas.", 401, {
        code: "INVALID_CREDENTIALS",
        hint: "Confirme username e password em POST /api/auth/42/admin/login. Por segurança não indicamos se a conta existe.",
      })
    }

    return issueAuthTokens({
      id: admin.id,
      username: admin.username,
      email: admin.email,
      full_name: admin.fullName,
      role: "ADMIN",
    })
  }
}
