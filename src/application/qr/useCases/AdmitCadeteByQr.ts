import { ApplicationError } from "../../errors/ApplicationError"
import { decryptQrPayload } from "../../../utils/qrCipher"
import { emitBoardingEvent } from "../../../WebSockets/socket"
import { AdmitCadeteByQrInput, AdmitCadeteResult, CadeteQrPayload } from "../dto"
import { CadeteRepository } from "../../../domain/cadetes/CadeteRepository"
import { DriverRepository } from "../../../domain/drivers/DriverRepository"
import { BoardingRequestRepository } from "../../../domain/boarding/BoardingRequestRepository"

export class AdmitCadeteByQrUseCase {
  constructor(
    private readonly drivers: DriverRepository,
    private readonly cadetes: CadeteRepository,
    private readonly boardingRequests: BoardingRequestRepository,
  ) {}

  async execute(input: AdmitCadeteByQrInput): Promise<AdmitCadeteResult & { requestId?: number; pending?: boolean; flagged?: boolean }> {
    if (input.role !== "DRIVER") {
      throw new ApplicationError(
        `O perfil ${input.role || "desconhecido"} não pode admitir cadetes por QR.`,
        403,
        {
          code: "FORBIDDEN_ROLE",
          hint: "Autentique-se como DRIVER em POST /api/qr/cadete/admit.",
        },
      )
    }
    if (!input.driverId || Number.isNaN(input.driverId)) {
      throw new ApplicationError("O id do motorista deve ser um inteiro positivo.", 422, {
        code: "INVALID_DRIVER_ID",
        hint: "O JWT do motorista deve ter o id da tabela Drivers.",
      })
    }
    if (!input.qr) {
      throw new ApplicationError("O campo qr é obrigatório.", 422, {
        code: "QR_REQUIRED",
        hint: "Envie { \"qr\": \"<QR de identificação do cadete>\" }.",
      })
    }

    const driver = await this.drivers.getById(input.driverId)
    if (!driver) {
      throw new ApplicationError(`Motorista #${input.driverId} não encontrado.`, 404, {
        code: "DRIVER_NOT_FOUND",
        hint: "Confirme o id do JWT em GET /api/drivers/:id.",
      })
    }
    if (!driver.currentRouteId) {
      throw new ApplicationError(
        `O motorista #${input.driverId} não tem rota atribuída. Sem rota não pode admitir cadetes.`,
        409,
        {
          code: "DRIVER_HAS_NO_ROUTE",
          hint: "Atribua uma rota antes de ler o QR do cadete.",
        },
      )
    }

    const payload = this.decode(input.qr)
    const now = Math.floor(Date.now() / 1000)
    if (now > payload.exp) {
      return {
        admitted: false,
        pending: false,
        flagged: false,
        reason: "QR do cadete expirado, peça para gerar um novo",
        cadete: { id: payload.cadeteId, fullName: null },
        driver: { id: driver.id, routeId: driver.currentRouteId },
      }
    }

    const routeInfo = await this.cadetes.getRouteInfo(payload.cadeteId)
    if (!routeInfo) {
      throw new ApplicationError(`Cadete #${payload.cadeteId} não encontrado no QR.`, 404, {
        code: "CADETE_NOT_FOUND",
        hint: "O QR deve pertencer a um cadete existente na tabela Cadetes.",
      })
    }

    const cadeteName = routeInfo.fullName ?? routeInfo.full_name ?? null
    const cadeteRoute = routeInfo.stop?.route
    const cadeteRouteId: number | null = cadeteRoute?.id ?? null
    const cadeteRouteName = cadeteRoute?.routeName ?? cadeteRoute?.route_name
    const eligible = cadeteRouteId !== null && cadeteRouteId === driver.currentRouteId

    if (!eligible) {
      return {
        admitted: false,
        pending: false,
        flagged: false,
        reason: "Este cadete não está atribuído à rota actual do motorista",
        cadete: { id: payload.cadeteId, fullName: cadeteName },
        route: cadeteRoute
          ? { id: cadeteRoute.id, routeName: cadeteRouteName }
          : undefined,
        driver: { id: driver.id, routeId: driver.currentRouteId },
      }
    }

    const request = await this.boardingRequests.admitNow({
      cadeteId: payload.cadeteId,
      driverId: driver.id,
      routeId: driver.currentRouteId,
    })

    emitBoardingEvent("boarding:request:updated", request)

    return {
      admitted: true,
      pending: false,
      flagged: false,
      requestId: request.id,
      reason: "Cadete admitido e registado na lista de embarque",
      cadete: { id: payload.cadeteId, fullName: cadeteName },
      route: cadeteRoute
        ? { id: cadeteRoute.id, routeName: cadeteRouteName }
        : undefined,
      driver: { id: driver.id, routeId: driver.currentRouteId },
    }
  }

  private decode(qr: string): CadeteQrPayload {
    let raw: string
    try {
      raw = decryptQrPayload(qr)
    } catch {
      throw new ApplicationError("QR de cadete inválido ou corrompido.", 422, {
        code: "INVALID_QR",
        hint: "Peça ao cadete para gerar um novo QR em POST /api/qr/cadete/generate.",
      })
    }
    let payload: CadeteQrPayload
    try {
      payload = JSON.parse(raw)
    } catch {
      throw new ApplicationError("QR de cadete inválido ou corrompido.", 422, {
        code: "INVALID_QR",
        hint: "O payload deve ser JSON { \"type\": \"cadete\", \"cadeteId\": <id> }.",
      })
    }
    if (payload.type !== "cadete" || !payload.cadeteId || !payload.exp) {
      throw new ApplicationError("Este QR não corresponde a um cadete válido.", 422, {
        code: "QR_NOT_CADETE",
        hint: "Use o QR de identificação do cadete (type=cadete), não o QR de embarque ou de rota.",
      })
    }
    return payload
  }
}