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

    let password = input.password
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
      photo: input.photo !== undefined ? input.photo : existing.photo,
      phone: input.phone !== undefined ? input.phone : existing.phone,
      currentRouteId: input.current_route_id !== undefined ? input.current_route_id : existing.currentRouteId,
    })
  }
}
