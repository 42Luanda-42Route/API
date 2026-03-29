import { CadeteRepository } from "../../../domain/cadetes/CadeteRepository"
import { Cadete } from "../../../domain/cadetes/Cadete"

export class ListCadetesUseCase {
  constructor(private readonly repo: CadeteRepository) {}

  async execute(): Promise<Cadete[]> {
    return this.repo.list()
  }
}
