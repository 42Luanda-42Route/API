import { CadeteRepository } from "../../../domain/cadetes/CadeteRepository"
import { Cadete } from "../../../domain/cadetes/Cadete"
import { CreateCadeteInput } from "../dto"

export class CreateCadeteUseCase {
  constructor(private readonly repo: CadeteRepository) {}

  async execute(input: CreateCadeteInput): Promise<Cadete> {
    return this.repo.create({
      fullName: input.full_name ?? null,
      username: input.username ?? null,
      email: input.email ?? null,
      city: input.city ?? null,
      distrit: input.distrit ?? null,
      prioritityList: input.prioritityList ?? false,
      phone: input.phone ?? null,
      stopId: input.stop_id ?? null,
    })
  }
}
