import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { DriverRepository } from "../../../domain/drivers/DriverRepository"
import { ApplicationError } from "../../errors/ApplicationError"
import { LoginDriverInput } from "../dto"

export class LoginDriverUseCase {
  constructor(private readonly repo: DriverRepository) {}

  async execute(input: LoginDriverInput): Promise<{ token: string }> {
    const driver = await this.repo.findByUsernameOrEmail(input.username)
    if (!driver) {
      throw new ApplicationError("username or email not found", 404)
    }

    const ok = await bcrypt.compare(input.password, driver.passwrd ?? "")
    if (!ok) {
      throw new ApplicationError("Credenciais erradas", 401)
    }

    const jwtToken = jwt.sign(
      {
        id: driver.id,
        full_name: driver.fullName,
        username: driver.username,
        email: driver.email,
        phone: driver.phone,
        role: "DRIVER",
      },
      process.env.JWT_SECRET as string,
      { expiresIn: "15m" },
    )

    return { token: jwtToken }
  }
}
