import { CadeteRepository } from "../../../domain/cadetes/CadeteRepository"
import { Cadete } from "../../../domain/cadetes/Cadete"
import { ApplicationError } from "../../errors/ApplicationError"

export class GetCadeteByIdUseCase {
  constructor(private readonly repo: CadeteRepository) {}

  async execute(id: number): Promise<Cadete> {
    if (!id || Number.isNaN(id)) {
      throw new ApplicationError("O id do cadete deve ser um inteiro positivo.", 422, {
        code: "INVALID_CADETE_ID",
        hint: "Use GET /api/cadetes/:id com um id numérico.",
      })
    }

    const cadete = await this.repo.getById(id)
    if (!cadete) {
      throw new ApplicationError(`Cadete #${id} não encontrado.`, 404, {
        code: "CADETE_NOT_FOUND",
        hint: "Liste cadetes em GET /api/cadetes e confirme o id.",
      })
    }

    return cadete
  }
}
