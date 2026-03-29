import { AdminRepository } from "../../../domain/admins/AdminRepository"
import { Admin } from "../../../domain/admins/Admin"

export class ListAdminsUseCase {
  constructor(private readonly repo: AdminRepository) {}

  async execute(): Promise<Omit<Admin, "password">[]> {
    const admins = await this.repo.list()
    return admins.map(({ password, ...rest }) => rest)
  }
}
