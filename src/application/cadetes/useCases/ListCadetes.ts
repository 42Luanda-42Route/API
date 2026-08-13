import { CadeteRepository } from "../../../domain/cadetes/CadeteRepository"
import { Cadete } from "../../../domain/cadetes/Cadete"

export class ListCadetesUseCase {
  constructor(private readonly repo: CadeteRepository) {}

  async execute(page = 1, limit = 20): Promise<{ data: Cadete[]; total: number; page: number; limit: number }> {
    const result = await this.repo.list(page, limit)
    return {
      data: result.data,
      total: result.total,
      page,
      limit,
    }
  }
}
