import { CadeteRepository } from "../../../domain/cadetes/CadeteRepository"
import { Cadete } from "../../../domain/cadetes/Cadete"
import { CreateCadeteInput } from "../dto"
import { ApplicationError } from "../../errors/ApplicationError"

export class CreateCadeteUseCase {
  constructor(private readonly repo: CadeteRepository) {}

  async execute(input: CreateCadeteInput): Promise<Cadete> {
    if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
      throw new ApplicationError(`O email «${input.email}» não é válido.`, 422, {
        code: "INVALID_EMAIL",
        hint: "Use um email no formato nome@dominio.tld em POST /api/cadetes.",
      })
    }

    if (input.username || input.email) {
      const existing = await this.repo.findByUsernameOrEmail(input.username || input.email || "")
      if (existing) {
        throw new ApplicationError(
          `Já existe um cadete com username «${input.username ?? existing.username}» ou email «${input.email ?? existing.email}».`,
          409,
          {
            code: "CADETE_ALREADY_EXISTS",
            hint: "Escolha outro username/email ou atualize o cadete existente com PUT /api/cadetes/:id.",
          },
        )
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
