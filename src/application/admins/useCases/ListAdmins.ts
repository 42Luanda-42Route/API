import { AdminRepository } from "../../../domain/admins/AdminRepository"
import { Admin } from "../../../domain/admins/Admin"

export class ListAdminsUseCase {
  constructor(private readonly repo: AdminRepository) {}

  async execute(page = 1, limit = 20): Promise<{ data: Omit<Admin, "password">[]; total: number; page: number; limit: number }> {
    const result = await this.repo.list(page, limit)
    return {
      data: result.data.map(({ password, ...rest }) => rest),
      total: result.total,
      page,
      limit,
    }
  }
}
