import { DriverRepository } from "../../../domain/drivers/DriverRepository"
import { Driver } from "../../../domain/drivers/Driver"

export class ListDriversUseCase {
  constructor(private readonly repo: DriverRepository) {}

  async execute(page = 1, limit = 20): Promise<{ data: Omit<Driver, "password">[]; total: number; page: number; limit: number }> {
    const result = await this.repo.list(page, limit)
    return {
      data: result.data.map(({ password, ...rest }) => rest),
      total: result.total,
      page,
      limit,
    }
  }
}
