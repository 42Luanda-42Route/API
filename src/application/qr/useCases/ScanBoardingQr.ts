import { CadeteRepository } from "../../../domain/cadetes/CadeteRepository"
import { BoardingRequestRepository } from "../../../domain/boarding/BoardingRequestRepository"
import { ApplicationError } from "../../errors/ApplicationError"
import { decryptQrPayload } from "../../../utils/qrCipher"
import { BoardingEligibilityResult, BoardingQrPayload, ScanBoardingQrInput } from "../dto"

export class ScanBoardingQrUseCase {
  constructor(
    private readonly cadetes: CadeteRepository,
    private readonly boardingRequests: BoardingRequestRepository,
  ) {}

  async execute(input: ScanBoardingQrInput): Promise<BoardingEligibilityResult> {
    if (input.role !== "CADETE") {
      throw new ApplicationError("Apenas cadetes podem validar embarque por QR", 403)
    }
    if (!input.cadeteId || Number.isNaN(input.cadeteId)) {
      throw new ApplicationError("Cadete id must be valid", 422)
    }
    if (!input.qr) {
      throw new ApplicationError("qr is required", 422)
    }

    const payload = this.decode(input.qr)

    const routeInfo = await this.cadetes.getRouteInfo(input.cadeteId)
    if (!routeInfo) {
      throw new ApplicationError("Cadete não encontrado", 404)
    }

    const now = Math.floor(Date.now() / 1000)
    if (now > payload.exp) {
      return {
        eligible: false,
        pending: false,
        flagged: false,
        reason: "QR code expirado, peça ao motorista para gerar um novo",
        cadete: { id: input.cadeteId, fullName: routeInfo.full_name ?? null },
      }
    }

    const cadeteRouteId: number | null = routeInfo.stop?.route?.id ?? null
    const eligible = cadeteRouteId !== null && cadeteRouteId === payload.routeId

    if (!eligible) {
      return {
        eligible: false,
        pending: false,
        flagged: false,
        reason: "Este cadete não está atribuído à rota deste motorista",
        cadete: { id: input.cadeteId, fullName: routeInfo.full_name ?? null },
        route: routeInfo.stop?.route
          ? { id: routeInfo.stop.route.id, routeName: routeInfo.stop.route.route_name }
          : undefined,
      }
    }

    let request = await this.boardingRequests.findPending(
      input.cadeteId,
      payload.driverId,
      payload.routeId,
    )
    if (!request) {
      request = await this.boardingRequests.createPending({
        cadeteId: input.cadeteId,
        driverId: payload.driverId,
        routeId: payload.routeId,
      })
    }

    return {
      eligible: true,
      pending: true,
      flagged: request.flagged,
      requestId: request.id,
      reason: "Pedido enviado ao motorista — aguarda aprovação",
      cadete: { id: input.cadeteId, fullName: routeInfo.full_name ?? null },
      route: routeInfo.stop?.route
        ? { id: routeInfo.stop.route.id, routeName: routeInfo.stop.route.route_name }
        : undefined,
    }
  }

  private decode(qr: string): BoardingQrPayload {
    let raw: string
    try {
      raw = decryptQrPayload(qr)
    } catch {
      throw new ApplicationError("QR code inválido ou corrompido", 422)
    }

    let payload: BoardingQrPayload
    try {
      payload = JSON.parse(raw)
    } catch {
      throw new ApplicationError("QR code inválido ou corrompido", 422)
    }

    if (payload.type !== "boarding" || !payload.routeId || !payload.driverId || !payload.exp) {
      throw new ApplicationError("QR code não corresponde a um embarque válido", 422)
    }

    return payload
  }
}
