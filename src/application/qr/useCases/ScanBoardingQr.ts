import { CadeteRepository } from "../../../domain/cadetes/CadeteRepository"
import { BoardingRequestRepository } from "../../../domain/boarding/BoardingRequestRepository"
import { ApplicationError } from "../../errors/ApplicationError"
import { decryptQrPayload } from "../../../utils/qrCipher"
import { emitToRoute } from "../../../WebSockets/socket"
import { BoardingEligibilityResult, BoardingQrPayload, ScanBoardingQrInput } from "../dto"

function serializeRequest(r: {
  id: number
  cadeteId: number
  driverId: number
  routeId: number
  status: string
  flagged: boolean
  createdAt: Date
  updatedAt: Date
  cadeteName?: string | null
  stopName?: string | null
}) {
  return {
    id: r.id,
    cadeteId: r.cadeteId,
    driverId: r.driverId,
    routeId: r.routeId,
    status: r.status,
    flagged: r.flagged,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    cadeteName: r.cadeteName ?? null,
    stopName: r.stopName ?? null,
  }
}

export class ScanBoardingQrUseCase {
  constructor(
    private readonly cadetes: CadeteRepository,
    private readonly boardingRequests: BoardingRequestRepository,
  ) {}

  async execute(input: ScanBoardingQrInput): Promise<BoardingEligibilityResult> {
    if (input.role !== "CADETE") {
      throw new ApplicationError(
        `O perfil ${input.role || "desconhecido"} não pode validar embarque por QR.`,
        403,
        {
          code: "FORBIDDEN_ROLE",
          hint: "Autentique-se como CADETE em POST /api/qr/boarding/scan.",
        },
      )
    }
    if (!input.cadeteId || Number.isNaN(input.cadeteId)) {
      throw new ApplicationError("O id do cadete deve ser um inteiro positivo.", 422, {
        code: "INVALID_CADETE_ID",
        hint: "O JWT do cadete deve ter o id da tabela Cadetes.",
      })
    }
    if (!input.qr) {
      throw new ApplicationError("O campo qr é obrigatório.", 422, {
        code: "QR_REQUIRED",
        hint: "Envie { \"qr\": \"<QR dinâmico do motorista>\" }.",
      })
    }

    const payload = this.decode(input.qr)
    const routeInfo = await this.cadetes.getRouteInfo(input.cadeteId)
    if (!routeInfo) {
      throw new ApplicationError(`Cadete #${input.cadeteId} não encontrado.`, 404, {
        code: "CADETE_NOT_FOUND",
        hint: "Confirme o id do JWT em GET /api/cadetes/:id.",
      })
    }

    const cadeteName = routeInfo.fullName ?? routeInfo.full_name ?? null
    const cadeteRoute = routeInfo.stop?.route
    const cadeteRouteName = cadeteRoute?.routeName ?? cadeteRoute?.route_name

    const now = Math.floor(Date.now() / 1000)
    if (now > payload.exp) {
      return {
        eligible: false,
        pending: false,
        flagged: false,
        reason: "QR code expirado, peça ao motorista para gerar um novo",
        cadete: { id: input.cadeteId, fullName: cadeteName },
      }
    }

    const cadeteRouteId: number | null = cadeteRoute?.id ?? null
    const eligible = cadeteRouteId !== null && cadeteRouteId === payload.routeId

    if (!eligible) {
      return {
        eligible: false,
        pending: false,
        flagged: false,
        reason: "Este cadete não está atribuído à rota deste motorista",
        cadete: { id: input.cadeteId, fullName: cadeteName },
        route: cadeteRoute
          ? { id: cadeteRoute.id, routeName: cadeteRouteName }
          : undefined,
      }
    }

    let request = await this.boardingRequests.findPending(
      input.cadeteId,
      payload.driverId,
      payload.routeId,
    )
    const created = !request
    if (!request) {
      request = await this.boardingRequests.createPending({
        cadeteId: input.cadeteId,
        driverId: payload.driverId,
        routeId: payload.routeId,
      })
    }

    emitToRoute(payload.routeId, "boarding:request", serializeRequest(request))

    return {
      eligible: true,
      pending: true,
      flagged: request.flagged,
      requestId: request.id,
      reason: created
        ? "Pedido enviado ao motorista — aguarda aprovação"
        : "Já existe um pedido pendente para este motorista",
      cadete: { id: input.cadeteId, fullName: cadeteName },
      route: cadeteRoute
        ? { id: cadeteRoute.id, routeName: cadeteRouteName }
        : undefined,
    }
  }

  private decode(qr: string): BoardingQrPayload {
    let raw: string
    try {
      raw = decryptQrPayload(qr)
    } catch {
      throw new ApplicationError("QR de embarque inválido ou corrompido.", 422, {
        code: "INVALID_QR",
        hint: "Peça ao motorista para gerar um novo QR em POST /api/qr/boarding/generate.",
      })
    }
    let payload: BoardingQrPayload
    try {
      payload = JSON.parse(raw)
    } catch {
      throw new ApplicationError("QR de embarque inválido ou corrompido.", 422, {
        code: "INVALID_QR",
        hint: "O payload deve ser JSON { \"type\": \"boarding\", \"routeId\": <id>, \"driverId\": <id> }.",
      })
    }
    if (payload.type !== "boarding" || !payload.routeId || !payload.driverId || !payload.exp) {
      throw new ApplicationError("Este QR não corresponde a um embarque válido.", 422, {
        code: "QR_NOT_BOARDING",
        hint: "Use o QR dinâmico do motorista (type=boarding), não o QR de rota ou de cadete.",
      })
    }
    return payload
  }
}
