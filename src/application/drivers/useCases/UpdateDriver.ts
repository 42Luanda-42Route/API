import bcrypt from "bcryptjs"
import { DriverRepository } from "../../../domain/drivers/DriverRepository"
import { Driver } from "../../../domain/drivers/Driver"
import { UpdateDriverInput } from "../dto"
import { ApplicationError } from "../../errors/ApplicationError"

export class UpdateDriverUseCase {
  constructor(private readonly repo: DriverRepository) {}

  async execute(id: number, input: UpdateDriverInput): Promise<Driver> {
    if (!id || Number.isNaN(id)) {
      throw new ApplicationError("Driver id must be valid", 422)
    }

    const existing = await this.repo.getById(id)
    if (!existing) {
      throw new ApplicationError("Driver not found", 404)
    }

    let passwrd = input.passwrd
    if (input.passwrd) {
      if (input.passwrd.length < 8) {
        throw new ApplicationError("Password must be at least 8 characters", 422)
      }
      passwrd = await bcrypt.hash(input.passwrd, 10)
    }

    return this.repo.update(id, {
      fullName: input.full_name ?? existing.fullName,
      username: input.username ?? existing.username,
      email: input.email ?? existing.email,
      passwrd: passwrd ?? existing.passwrd,
      photo: input.photo ?? existing.photo,
      phone: input.phone ?? existing.phone,
      currentRouteId: input.current_route_id ?? existing.currentRouteId,
    })
  }
}
