import { AdminRepository } from "../../../domain/admins/AdminRepository"
import { Admin } from "../../../domain/admins/Admin"
import { ApplicationError } from "../../errors/ApplicationError"

export class GetAdminByIdUseCase {
  constructor(private readonly repo: AdminRepository) {}

  async execute(id: number): Promise<Omit<Admin, "password">> {
    if (!id || Number.isNaN(id)) {
      throw new ApplicationError("O id do administrador deve ser um inteiro positivo.", 422, {
        code: "INVALID_ADMIN_ID",
        hint: "Use GET /api/admins/:id com um id numérico, por exemplo GET /api/admins/1.",
      })
    }

    const admin = await this.repo.getById(id)
    if (!admin) {
      throw new ApplicationError(`Administrador #${id} não encontrado.`, 404, {
        code: "ADMIN_NOT_FOUND",
        hint: "Liste administradores em GET /api/admins (perfil ADMIN) e confirme o id.",
      })
    }

    const { password, ...rest } = admin
    return rest
  }
}
