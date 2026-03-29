import { CadeteRepository } from "../../../domain/cadetes/CadeteRepository"

export class FindCadeteByUsernameOrEmailUseCase {
  constructor(private readonly repo: CadeteRepository) {}

  async execute(usernameOrEmail: string) {
    return this.repo.findByUsernameOrEmail(usernameOrEmail)
  }
}
