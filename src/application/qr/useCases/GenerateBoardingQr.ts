import { DriverRepository } from "../../../domain/drivers/DriverRepository"
import { ApplicationError } from "../../errors/ApplicationError"
import { encryptQrPayload } from "../../../utils/qrCipher"
import { env } from "../../../config/env"
import { BoardingQrPayload, GenerateBoardingQrInput } from "../dto"

// QR dinâmico que o backend emite para o motorista mostrar em ecrã durante a viagem.
// TTL curto para impedir reutilização (screenshot/replay).
export class GenerateBoardingQrUseCase {
  constructor(private readonly drivers: DriverRepository) {}

  async execute(input: GenerateBoardingQrInput): Promise<{ qr: string; expiresAt: string; routeId: number }> {
    if (!input.driverId || Number.isNaN(input.driverId)) {
      throw new ApplicationError("Driver id must be valid", 422)
    }

    const driver = await this.drivers.getById(input.driverId)
    if (!driver) {
      throw new ApplicationError("Driver not found", 404)
    }
    if (!driver.currentRouteId) {
      throw new ApplicationError("Motorista não está atribuído a nenhuma rota", 409)
    }

    const iat = Math.floor(Date.now() / 1000)
    const exp = iat + env.QR_BOARDING_TTL_SECONDS

    const payload: BoardingQrPayload = {
      type: "boarding",
      routeId: driver.currentRouteId,
      driverId: driver.id,
      iat,
      exp,
    }

    return {
      qr: encryptQrPayload(JSON.stringify(payload)),
      expiresAt: new Date(exp * 1000).toISOString(),
      routeId: driver.currentRouteId,
    }
  }
}
