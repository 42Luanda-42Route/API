import bcrypt from "bcryptjs"
import { DriverRepository } from "../../../domain/drivers/DriverRepository"
import { ApplicationError } from "../../errors/ApplicationError"
import { LoginDriverInput } from "../dto"
import { generateToken } from "../../../utils/jwt"

export class LoginDriverUseCase {
  constructor(private readonly repo: DriverRepository) {}

  async execute(input: LoginDriverInput): Promise<{ token: string }> {
    const driver = await this.repo.findByUsernameOrEmail(input.username)
    if (!driver) {
      throw new ApplicationError("Invalid credentials", 401)
    }

    const ok = await bcrypt.compare(input.password, driver.password ?? "")
    if (!ok) {
      throw new ApplicationError("Invalid credentials", 401)
    }

    const jwtToken = generateToken({
      id: driver.id,
      full_name: driver.fullName,
      username: driver.username,
      email: driver.email,
      phone: driver.phone,
      role: "DRIVER",
    })

    return { token: jwtToken }
  }
}
