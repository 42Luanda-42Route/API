import bcrypt from "bcryptjs"
import { DriverRepository } from "../../../domain/drivers/DriverRepository"
import { Driver } from "../../../domain/drivers/Driver"
import { UpdateDriverInput } from "../dto"
import { ApplicationError } from "../../errors/ApplicationError"
import { TripActor } from "../../trips/useCases/TripUseCases"

export class UpdateDriverUseCase {
  constructor(private readonly repo: DriverRepository) {}

  async execute(id: number, input: UpdateDriverInput, actor?: TripActor): Promise<Driver> {
    if (!id || Number.isNaN(id)) {
      throw new ApplicationError("O id do motorista deve ser um inteiro positivo.", 422, {
        code: "INVALID_DRIVER_ID",
        hint: "Use PUT /api/drivers/:id com um id numérico.",
      })
    }

    const existing = await this.repo.getById(id)
    if (!existing) {
      throw new ApplicationError(`Motorista #${id} não encontrado. Não é possível atualizar.`, 404, {
        code: "DRIVER_NOT_FOUND",
        hint: "Liste motoristas em GET /api/drivers e confirme o id.",
      })
    }

    const role = actor?.role?.toUpperCase()
    if (role === "DRIVER") {
      if (actor && actor.id !== id) {
        throw new ApplicationError(
          `O motorista #${actor.id} só pode atualizar o próprio perfil. Pediu o motorista #${id}.`,
          403,
          {
            code: "FORBIDDEN_RESOURCE",
            hint: `Use PUT /api/drivers/${actor.id}.`,
          },
        )
      }
      if (input.current_route_id !== undefined) {
        throw new ApplicationError(
          "O motorista não pode alterar current_route_id neste endpoint.",
          403,
          {
            code: "DRIVER_CANNOT_ASSIGN_ROUTE",
            hint: "Peça a um ADMIN POST /api/drivers/:id/assign-route ou use DELETE /api/drivers/:id/leave-route.",
          },
        )
      }
      if (input.username !== undefined || input.email !== undefined) {
        throw new ApplicationError(
          "O motorista não pode alterar username ou email. Só um ADMIN pode fazê-lo.",
          403,
          {
            code: "DRIVER_CANNOT_EDIT_FIELD",
            hint: "Pode atualizar full_name, photo, phone e password.",
          },
        )
      }
    }

    let password = input.password
    if (input.password) {
      if (input.password.length < 8) {
        throw new ApplicationError("A password deve ter pelo menos 8 caracteres.", 422, {
          code: "PASSWORD_TOO_SHORT",
          hint: "Envie password com 8 ou mais caracteres.",
        })
      }
      password = await bcrypt.hash(input.password, 10)
    }

    return this.repo.update(id, {
      fullName: input.full_name !== undefined ? input.full_name : existing.fullName,
      username: input.username !== undefined ? input.username : existing.username,
      email: input.email !== undefined ? input.email : existing.email,
      password: password ?? existing.password,
      photo: input.photo !== undefined ? input.photo : existing.photo,
      phone: input.phone !== undefined ? input.phone : existing.phone,
      currentRouteId: input.current_route_id !== undefined ? input.current_route_id : existing.currentRouteId,
    })
  }
}
