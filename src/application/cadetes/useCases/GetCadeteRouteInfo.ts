import { CadeteRepository } from "../../../domain/cadetes/CadeteRepository"
import { ApplicationError } from "../../errors/ApplicationError"

function mapRouteInfo(raw: any) {
  const stop = raw.stop
  if (!stop) {
    return { fullName: raw.fullName ?? raw.full_name ?? null, stop: null }
  }
  const route = stop.route
  return {
    fullName: raw.fullName ?? raw.full_name ?? null,
    stop: {
      id: stop.id,
      stopName: stop.stopName ?? stop.stop_name ?? null,
      district: stop.district ?? null,
      latitude: stop.latitude ?? null,
      longitude: stop.longitude ?? null,
      route: route
        ? {
            id: route.id,
            routeName: route.routeName ?? route.route_name ?? null,
            description: route.description ?? null,
            drivers: (route.drivers ?? []).map((driver: any) => ({
              fullName: driver.fullName ?? driver.full_name ?? null,
              phone: driver.phone ?? null,
            })),
          }
        : null,
    },
  }
}

export class GetCadeteRouteInfoUseCase {
  constructor(private readonly repo: CadeteRepository) {}

  async execute(id: number) {
    if (!id || Number.isNaN(id)) {
      throw new ApplicationError("O id do cadete deve ser um inteiro positivo.", 422, {
        code: "INVALID_CADETE_ID",
        hint: "Use GET /api/cadetes/:id/route-info com um id numérico.",
      })
    }

    const routeInfo = await this.repo.getRouteInfo(id)
    if (!routeInfo) {
      throw new ApplicationError(`Cadete #${id} não encontrado.`, 404, {
        code: "CADETE_NOT_FOUND",
        hint: "Confirme o id em GET /api/cadetes. O JWT deve usar o id da tabela Cadetes.",
      })
    }

    const mapped = mapRouteInfo(routeInfo)
    if (!mapped.stop?.route) {
      throw new ApplicationError(
        `O cadete #${id} não tem paragem ou rota associada.`,
        404,
        {
          code: "CADETE_WITHOUT_ROUTE",
          hint: `Atualize a paragem em PUT /api/cadetes/${id} com { "stop_id": <id da paragem> }.`,
        },
      )
    }

    return mapped
  }
}
