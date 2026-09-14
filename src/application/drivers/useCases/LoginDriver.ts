import bcrypt from "bcryptjs"
import { DriverRepository } from "../../../domain/drivers/DriverRepository"
import { ApplicationError } from "../../errors/ApplicationError"
import { LoginDriverInput } from "../dto"
import { issueAuthTokens } from "../../../utils/jwt"

export class LoginDriverUseCase {
  constructor(private readonly repo: DriverRepository) {}

  async execute(input: LoginDriverInput) {
    const driver = await this.repo.findByUsernameOrEmail(input.username)
    if (!driver) {
      throw new ApplicationError("Credenciais inválidas.", 401, {
        code: "INVALID_CREDENTIALS",
        hint: "Confirme username e password em POST /api/auth/42/driver/login. Por segurança não indicamos se a conta existe.",
      })
    }

    const ok = await bcrypt.compare(input.password, driver.password ?? "")
    if (!ok) {
      throw new ApplicationError("Credenciais inválidas.", 401, {
        code: "INVALID_CREDENTIALS",
        hint: "Confirme username e password em POST /api/auth/42/driver/login. Por segurança não indicamos se a conta existe.",
      })
    }

    return issueAuthTokens({
      id: driver.id,
      full_name: driver.fullName,
      username: driver.username,
      email: driver.email,
      phone: driver.phone,
      role: "DRIVER",
      currentRouteId: driver.currentRouteId,
    })
  }
}
