import { DriverRepository } from "../../../domain/drivers/DriverRepository"
import { Driver } from "../../../domain/drivers/Driver"
import { ApplicationError } from "../../errors/ApplicationError"

export class LeaveRouteUseCase {
  constructor(private readonly repo: DriverRepository) {}

  async execute(driverId: number): Promise<Driver> {
    if (!driverId || Number.isNaN(driverId)) {
      throw new ApplicationError("O id do motorista deve ser um inteiro positivo.", 422, {
        code: "INVALID_DRIVER_ID",
        hint: "Use DELETE /api/drivers/:id/leave-route com um id numérico.",
      })
    }

    const existing = await this.repo.getById(driverId)
    if (!existing) {
      throw new ApplicationError(`Motorista #${driverId} não encontrado. Não é possível sair da rota.`, 404, {
        code: "DRIVER_NOT_FOUND",
        hint: "Liste motoristas em GET /api/drivers e confirme o id.",
      })
    }

    if (!existing.currentRouteId) {
      throw new ApplicationError(`O motorista #${driverId} já não está atribuído a nenhuma rota.`, 409, {
        code: "DRIVER_HAS_NO_ROUTE",
        hint: "Atribua uma rota com POST /api/drivers/:id/assign-route ou ao ler o QR da rota.",
      })
    }

    return this.repo.leaveRoute(driverId)
  }
}
