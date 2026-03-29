import { DriverRepository } from "../../../domain/drivers/DriverRepository"
import { Driver } from "../../../domain/drivers/Driver"

export class ListDriversUseCase {
  constructor(private readonly repo: DriverRepository) {}

  async execute(): Promise<Omit<Driver, "passwrd">[]> {
    const drivers = await this.repo.list()
    return drivers.map(({ passwrd, ...rest }) => rest)
  }
}
