import { CadeteRepository } from "../../../domain/cadetes/CadeteRepository"
import { Cadete } from "../../../domain/cadetes/Cadete"
import { UpdateCadeteInput } from "../dto"
import { ApplicationError } from "../../errors/ApplicationError"
import { TripActor } from "../../trips/useCases/TripUseCases"

const CADETE_FORBIDDEN_FIELDS: Array<keyof UpdateCadeteInput> = [
  "username",
  "email",
  "priorityList",
]

export class UpdateCadeteUseCase {
  constructor(private readonly repo: CadeteRepository) {}

  async execute(id: number, input: UpdateCadeteInput, actor?: TripActor): Promise<Cadete> {
    if (!id || Number.isNaN(id)) {
      throw new ApplicationError("O id do cadete deve ser um inteiro positivo.", 422, {
        code: "INVALID_CADETE_ID",
        hint: "Use PUT /api/cadetes/:id com um id numérico.",
      })
    }

    const existing = await this.repo.getById(id)
    if (!existing) {
      throw new ApplicationError(`Cadete #${id} não encontrado. Não é possível atualizar.`, 404, {
        code: "CADETE_NOT_FOUND",
        hint: "Liste cadetes em GET /api/cadetes e confirme o id.",
      })
    }

    const role = actor?.role?.toUpperCase()
    if (role === "CADETE") {
      if (actor && actor.id !== id) {
        throw new ApplicationError(
          `O cadete #${actor.id} só pode atualizar o próprio perfil. Pediu o cadete #${id}.`,
          403,
          {
            code: "FORBIDDEN_RESOURCE",
            hint: `Use PUT /api/cadetes/${actor.id}.`,
          },
        )
      }
      const forbidden = CADETE_FORBIDDEN_FIELDS.filter((field) => input[field] !== undefined)
      if (forbidden.length) {
        throw new ApplicationError(
          `O cadete não pode alterar os campos: ${forbidden.join(", ")}. Só um ADMIN pode fazê-lo.`,
          403,
          {
            code: "CADETE_CANNOT_EDIT_FIELD",
            hint: "Pode atualizar full_name, city, district, phone e stop_id.",
          },
        )
      }
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
