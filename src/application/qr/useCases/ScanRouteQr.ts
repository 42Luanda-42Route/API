import { Driver } from "../../../domain/drivers/Driver"
import { ApplicationError } from "../../errors/ApplicationError"
import { decryptQrPayload } from "../../../utils/qrCipher"
import { AssignRouteUseCase } from "../../drivers/useCases/AssignRoute"
import { RouteQrPayload, ScanRouteQrInput } from "../dto"

// QR físico já existente (impresso na viatura/paragem): cifrado com AES-ECB,
// payload em texto simples é um JSON { type: "route", routeId }.
export class ScanRouteQrUseCase {
  constructor(private readonly assignRoute: AssignRouteUseCase) {}

  async execute(input: ScanRouteQrInput): Promise<Driver> {
    if (!input.driverId || Number.isNaN(input.driverId)) {
      throw new ApplicationError("Driver id must be valid", 422)
    }
    if (!input.qr) {
      throw new ApplicationError("qr is required", 422)
    }

    const payload = this.decode(input.qr)

    return this.assignRoute.execute({ driverId: input.driverId, current_route_id: payload.routeId })
  }

  private decode(qr: string): RouteQrPayload {
    let raw: string
    try {
      raw = decryptQrPayload(qr)
    } catch {
      throw new ApplicationError("QR code inválido ou corrompido", 422)
    }

    let payload: RouteQrPayload
    try {
      payload = JSON.parse(raw)
    } catch {
      throw new ApplicationError("QR code inválido ou corrompido", 422)
    }

    if (payload.type !== "route" || !payload.routeId || Number.isNaN(Number(payload.routeId))) {
      throw new ApplicationError("QR code não corresponde a uma rota válida", 422)
    }

    return payload
  }
}
