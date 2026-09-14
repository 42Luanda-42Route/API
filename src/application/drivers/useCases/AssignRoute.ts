import { DriverRepository } from "../../../domain/drivers/DriverRepository"
import { RouteRepository } from "../../../domain/routes/RouteRepository"
import { Driver } from "../../../domain/drivers/Driver"
import { ApplicationError } from "../../errors/ApplicationError"
import { AssignRouteInput } from "../dto"

export class AssignRouteUseCase {
  constructor(private readonly drivers: DriverRepository, private readonly routes: RouteRepository) {}

  async execute(input: AssignRouteInput): Promise<Driver> {
    if (!input.driverId || Number.isNaN(input.driverId)) {
      throw new ApplicationError("O id do motorista deve ser um inteiro positivo.", 422, {
        code: "INVALID_DRIVER_ID",
        hint: "Use POST /api/drivers/:id/assign-route com um id numérico.",
      })
    }
    if (!input.current_route_id || Number.isNaN(input.current_route_id)) {
      throw new ApplicationError("O campo current_route_id deve ser um inteiro positivo.", 422, {
        code: "INVALID_ROUTE_ID",
        hint: "Envie { \"current_route_id\": <id da rota existente> }.",
      })
    }

    const driver = await this.drivers.getById(input.driverId)
    if (!driver) {
      throw new ApplicationError(`Motorista #${input.driverId} não encontrado. Não é possível atribuir rota.`, 404, {
        code: "DRIVER_NOT_FOUND",
        hint: "Liste motoristas em GET /api/drivers e confirme o id.",
      })
    }

    const route = await this.routes.getById(input.current_route_id)
    if (!route) {
      throw new ApplicationError(
        `A rota #${input.current_route_id} não existe. Não é possível atribuí-la ao motorista #${input.driverId}.`,
        404,
        {
          code: "ROUTE_NOT_FOUND",
          hint: "Liste rotas em GET /api/routes e use um current_route_id válido.",
        },
      )
    }

    const existingDriverId = await this.drivers.findDriverIdByRoute(input.current_route_id)
    if (existingDriverId && existingDriverId !== input.driverId) {
      await this.drivers.leaveRoute(existingDriverId)
    }

    return this.drivers.assignRoute(input.driverId, input.current_route_id)
  }
}
