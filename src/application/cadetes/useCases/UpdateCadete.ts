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
      throw new ApplicationError("Cadete não encontrado", 404)
    }

    return this.repo.update(id, {
      fullName: input.full_name ?? existing.fullName,
      username: input.username ?? existing.username,
      email: input.email ?? existing.email,
      city: input.city ?? existing.city,
      distrit: input.distrit ?? existing.distrit,
      prioritityList: input.prioritityList ?? existing.prioritityList,
      phone: input.phone ?? existing.phone,
      stopId: input.stop_id ?? existing.stopId,
    })
  }
}
