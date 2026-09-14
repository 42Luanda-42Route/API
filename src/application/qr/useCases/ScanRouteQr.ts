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
      throw new ApplicationError("O id do motorista deve ser um inteiro positivo.", 422, {
        code: "INVALID_DRIVER_ID",
        hint: "O JWT do motorista deve ter o id da tabela Drivers.",
      })
    }
    if (!input.qr) {
      throw new ApplicationError("O campo qr é obrigatório.", 422, {
        code: "QR_REQUIRED",
        hint: "Envie { \"qr\": \"<payload cifrado da rota>\" } em POST /api/qr/route/scan.",
      })
    }

    const payload = this.decode(input.qr)

    return this.assignRoute.execute({ driverId: input.driverId, current_route_id: payload.routeId })
  }

  private decode(qr: string): RouteQrPayload {
    let raw: string
    try {
      raw = decryptQrPayload(qr)
    } catch {
      throw new ApplicationError("QR de rota inválido ou corrompido.", 422, {
        code: "INVALID_QR",
        hint: "Use o QR físico da viatura/paragem gerado para type=route.",
      })
    }

    let payload: RouteQrPayload
    try {
      payload = JSON.parse(raw)
    } catch {
      throw new ApplicationError("QR de rota inválido ou corrompido.", 422, {
        code: "INVALID_QR",
        hint: "O payload deve ser JSON { \"type\": \"route\", \"routeId\": <id> }.",
      })
    }

    if (payload.type !== "route" || !payload.routeId || Number.isNaN(Number(payload.routeId))) {
      throw new ApplicationError("Este QR não corresponde a uma rota válida.", 422, {
        code: "QR_NOT_ROUTE",
        hint: "O QR de rota tem type=route. QRs de embarque ou de cadete não servem neste endpoint.",
      })
    }

    return payload
  }
}
