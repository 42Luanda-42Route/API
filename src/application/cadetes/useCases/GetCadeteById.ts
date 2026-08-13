import { CadeteRepository } from "../../../domain/cadetes/CadeteRepository"
import { Cadete } from "../../../domain/cadetes/Cadete"
import { ApplicationError } from "../../errors/ApplicationError"

export class GetCadeteByIdUseCase {
  constructor(private readonly repo: CadeteRepository) {}

  async execute(id: number): Promise<Cadete> {
    if (!id || Number.isNaN(id)) {
      throw new ApplicationError("Cadete id must be valid", 422)
    }

    const cadete = await this.repo.getById(id)
    if (!cadete) {
      throw new ApplicationError("Cadete not found", 404)
    }

    return cadete
  }
}
