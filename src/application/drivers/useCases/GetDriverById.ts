import { DriverRepository } from "../../../domain/drivers/DriverRepository"
import { Driver } from "../../../domain/drivers/Driver"
import { ApplicationError } from "../../errors/ApplicationError"

export class GetDriverByIdUseCase {
  constructor(private readonly repo: DriverRepository) {}

  async execute(id: number): Promise<Omit<Driver, "password">> {
    if (!id || Number.isNaN(id)) {
      throw new ApplicationError("O id do motorista deve ser um inteiro positivo.", 422, {
        code: "INVALID_DRIVER_ID",
        hint: "Use GET /api/drivers/:id com um id numérico.",
      })
    }

    const driver = await this.repo.getById(id)
    if (!driver) {
      throw new ApplicationError(`Motorista #${id} não encontrado.`, 404, {
        code: "DRIVER_NOT_FOUND",
        hint: "Liste motoristas em GET /api/drivers e confirme o id.",
      })
    }

    const { password, ...rest } = driver
    return rest
  }
}
