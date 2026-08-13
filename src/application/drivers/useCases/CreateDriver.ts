import bcrypt from "bcryptjs"
import { DriverRepository } from "../../../domain/drivers/DriverRepository"
import { Driver } from "../../../domain/drivers/Driver"
import { CreateDriverInput } from "../dto"
import { ApplicationError } from "../../errors/ApplicationError"

export class CreateDriverUseCase {
  constructor(private readonly repo: DriverRepository) {}

  async execute(input: CreateDriverInput): Promise<Driver> {
    if (!input.password || input.password.length < 8) {
      throw new ApplicationError("Password must be at least 8 characters", 422)
    }

    if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
      throw new ApplicationError("Invalid email format", 422)
    }

    if (input.username || input.email) {
      const existing = await this.repo.findByUsernameOrEmail(input.username || input.email || "")
      if (existing) {
        throw new ApplicationError("Username or email already exists", 409)
      }
    }

    const hashed = await bcrypt.hash(input.password, 10)
    return this.repo.create({
      fullName: input.full_name ?? null,
      username: input.username ?? null,
      email: input.email ?? null,
      password: hashed,
      photo: input.photo ?? null,
      phone: input.phone ?? null,
      currentRouteId: null,
    })
  }
}
