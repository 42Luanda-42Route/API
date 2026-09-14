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
      throw new ApplicationError("O id do motorista deve ser um inteiro positivo.", 422, {
        code: "INVALID_DRIVER_ID",
        hint: "O JWT do motorista deve ter o id da tabela Drivers.",
      })
    }

    const driver = await this.drivers.getById(input.driverId)
    if (!driver) {
      throw new ApplicationError(`Motorista #${input.driverId} não encontrado. Não é possível gerar QR de embarque.`, 404, {
        code: "DRIVER_NOT_FOUND",
        hint: "Confirme o id do JWT em GET /api/drivers/:id.",
      })
    }
    if (!driver.currentRouteId) {
      throw new ApplicationError(
        `O motorista #${input.driverId} não tem rota atribuída. Sem rota não há QR de embarque.`,
        409,
        {
          code: "DRIVER_HAS_NO_ROUTE",
          hint: "Atribua uma rota (POST /api/drivers/:id/assign-route ou QR de rota) antes de gerar o QR de embarque.",
        },
      )
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
