import { ApplicationError } from "../../errors/ApplicationError"
import { decryptQrPayload } from "../../../utils/qrCipher"
import { AdmitCadeteByQrInput, AdmitCadeteResult, CadeteQrPayload } from "../dto"
import { CadeteRepository } from "../../../domain/cadetes/CadeteRepository"
import { DriverRepository } from "../../../domain/drivers/DriverRepository"

export class AdmitCadeteByQrUseCase {
  constructor(
    private readonly drivers: DriverRepository,
    private readonly cadetes: CadeteRepository,
  ) {}

  async execute(input: AdmitCadeteByQrInput): Promise<AdmitCadeteResult> {
    if (input.role !== "DRIVER") {
      throw new ApplicationError("Apenas motoristas podem admitir cadetes por QR", 403)
    }
    if (!input.driverId || Number.isNaN(input.driverId)) {
      throw new ApplicationError("Driver id must be valid", 422)
    }
    if (!input.qr) {
      throw new ApplicationError("qr is required", 422)
    }

    const driver = await this.drivers.getById(input.driverId)
    if (!driver) {
      throw new ApplicationError("Driver not found", 404)
    }
    if (!driver.currentRouteId) {
      throw new ApplicationError("Motorista não está atribuído a nenhuma rota", 409)
    }

    const payload = this.decode(input.qr)
    const now = Math.floor(Date.now() / 1000)
    if (now > payload.exp) {
      return {
        admitted: false,
        reason: "QR do cadete expirado, peça para gerar um novo",
        cadete: { id: payload.cadeteId, fullName: null },
        driver: { id: driver.id, routeId: driver.currentRouteId },
      }
    }

    const routeInfo = await this.cadetes.getRouteInfo(payload.cadeteId)
    if (!routeInfo) {
      throw new ApplicationError("Cadete não encontrado", 404)
    }

    const cadeteRouteId: number | null = routeInfo.stop?.route?.id ?? null
    const admitted = cadeteRouteId !== null && cadeteRouteId === driver.currentRouteId

    return {
      admitted,
      reason: admitted
        ? undefined
        : "Este cadete não está atribuído à rota actual do motorista",
      cadete: { id: payload.cadeteId, fullName: routeInfo.full_name ?? null },
      route: routeInfo.stop?.route
        ? { id: routeInfo.stop.route.id, routeName: routeInfo.stop.route.route_name }
        : undefined,
      driver: { id: driver.id, routeId: driver.currentRouteId },
    }
  }

  private decode(qr: string): CadeteQrPayload {
    let raw: string
    try {
      raw = decryptQrPayload(qr)
    } catch {
      throw new ApplicationError("QR code inválido ou corrompido", 422)
    }

    let payload: CadeteQrPayload
    try {
      payload = JSON.parse(raw)
    } catch {
      throw new ApplicationError("QR code inválido ou corrompido", 422)
    }

    if (payload.type !== "cadete" || !payload.cadeteId || !payload.exp) {
      throw new ApplicationError("QR code não corresponde a um cadete válido", 422)
    }

    return payload
  }
}
