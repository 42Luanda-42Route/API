import { CadeteRepository } from "../../../domain/cadetes/CadeteRepository"
import { Cadete } from "../../../domain/cadetes/Cadete"
import { CreateCadeteInput } from "../dto"
import { ApplicationError } from "../../errors/ApplicationError"

export class CreateCadeteUseCase {
  constructor(private readonly repo: CadeteRepository) {}

  async execute(input: CreateCadeteInput): Promise<Cadete> {
    if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
      throw new ApplicationError("Invalid email format", 422)
    }

    if (input.username || input.email) {
      const existing = await this.repo.findByUsernameOrEmail(input.username || input.email || "")
      if (existing) {
        throw new ApplicationError("Username or email already exists", 409)
      }
    }

    return this.repo.create({
      fullName: input.full_name ?? null,
      username: input.username ?? null,
      email: input.email ?? null,
      city: input.city ?? null,
      district: input.district ?? null,
      priorityList: input.priorityList ?? false,
      phone: input.phone ?? null,
      stopId: input.stop_id ?? null,
    })
  }
}
