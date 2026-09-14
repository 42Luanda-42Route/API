import bcrypt from "bcryptjs"
import { AdminRepository } from "../../../domain/admins/AdminRepository"
import { Admin } from "../../../domain/admins/Admin"
import { UpdateAdminInput } from "../dto"
import { ApplicationError } from "../../errors/ApplicationError"

export class UpdateAdminUseCase {
  constructor(private readonly repo: AdminRepository) {}

  async execute(id: number, input: UpdateAdminInput): Promise<Admin> {
    if (!id || Number.isNaN(id)) {
      throw new ApplicationError("O id do administrador deve ser um inteiro positivo.", 422, {
        code: "INVALID_ADMIN_ID",
        hint: "Use PUT /api/admins/:id com um id numérico.",
      })
    }

    const existing = await this.repo.getById(id)
    if (!existing) {
      throw new ApplicationError(`Administrador #${id} não encontrado. Não é possível atualizar.`, 404, {
        code: "ADMIN_NOT_FOUND",
        hint: "Liste administradores em GET /api/admins e confirme o id.",
      })
    }

    let password: string | null | undefined = input.password
    if (input.password) {
      if (input.password.length < 8) {
        throw new ApplicationError("A password do administrador deve ter pelo menos 8 caracteres.", 422, {
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
    })
  }
}
