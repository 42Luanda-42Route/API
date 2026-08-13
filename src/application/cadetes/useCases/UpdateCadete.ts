import { CadeteRepository } from "../../../domain/cadetes/CadeteRepository"
import { Cadete } from "../../../domain/cadetes/Cadete"
import { UpdateCadeteInput } from "../dto"
import { ApplicationError } from "../../errors/ApplicationError"

export class UpdateCadeteUseCase {
  constructor(private readonly repo: CadeteRepository) {}

  async execute(id: number, input: UpdateCadeteInput): Promise<Cadete> {
    if (!id || Number.isNaN(id)) {
      throw new ApplicationError("Cadete id must be valid", 422)
    }

    const existing = await this.repo.getById(id)
    if (!existing) {
      throw new ApplicationError("Cadete not found", 404)
    }

    return this.repo.update(id, {
      fullName: input.full_name !== undefined ? input.full_name : existing.fullName,
      username: input.username !== undefined ? input.username : existing.username,
      email: input.email !== undefined ? input.email : existing.email,
      city: input.city !== undefined ? input.city : existing.city,
      district: input.district !== undefined ? input.district : existing.district,
      priorityList: input.priorityList !== undefined ? input.priorityList : existing.priorityList,
      phone: input.phone !== undefined ? input.phone : existing.phone,
      stopId: input.stop_id !== undefined ? input.stop_id : existing.stopId,
    })
  }
}
