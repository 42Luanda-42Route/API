import { CadeteRepository } from "../../../domain/cadetes/CadeteRepository"
import { ApplicationError } from "../../errors/ApplicationError"

export class DeleteCadeteUseCase {
  constructor(private readonly repo: CadeteRepository) {}

  async execute(id: number): Promise<void> {
    if (!id || Number.isNaN(id)) {
      throw new ApplicationError("Cadete id must be valid", 422)
    }

    const existing = await this.repo.getById(id)
    if (!existing) {
      throw new ApplicationError("Cadete not found", 404)
    }

    await this.repo.delete(id)
  }
}
