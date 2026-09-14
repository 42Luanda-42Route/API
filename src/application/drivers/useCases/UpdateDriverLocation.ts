import { DriverRepository } from "../../../domain/drivers/DriverRepository"
import { DriverCoordinates } from "../../../domain/drivers/Driver"
import { UpdateLocationInput } from "../dto"
import { ApplicationError } from "../../errors/ApplicationError"

export class UpdateDriverLocationUseCase {
  constructor(private readonly repo: DriverRepository) {}

  async execute(input: UpdateLocationInput): Promise<DriverCoordinates> {
    if (!input.driverId || Number.isNaN(input.driverId)) {
      throw new ApplicationError("O id do motorista deve ser um inteiro positivo.", 422, {
        code: "INVALID_DRIVER_ID",
        hint: "Use PUT /api/drivers/:id/location com um id numérico.",
      })
    }

    if (input.lat < -90 || input.lat > 90) {
      throw new ApplicationError(
        `A latitude ${input.lat} é inválida. Deve estar entre -90 e 90.`,
        422,
        {
          code: "INVALID_LATITUDE",
          hint: "Envie { \"lat\": <número>, \"long\": <número> } com lat entre -90 e 90.",
        },
      )
    }

    if (input.long < -180 || input.long > 180) {
      throw new ApplicationError(
        `A longitude ${input.long} é inválida. Deve estar entre -180 e 180.`,
        422,
        {
          code: "INVALID_LONGITUDE",
          hint: "Envie { \"lat\": <número>, \"long\": <número> } com long entre -180 e 180.",
        },
      )
    }

    return this.repo.updateLocation(input.driverId, { lat: input.lat, long: input.long })
  }
}
