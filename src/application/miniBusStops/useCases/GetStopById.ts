import { MiniBusStopRepository } from "../../../domain/miniBusStops/MiniBusStopRepository"
import { MiniBusStop } from "../../../domain/miniBusStops/MiniBusStop"
import { ApplicationError } from "../../errors/ApplicationError"

export class GetStopByIdUseCase {
  constructor(private readonly repo: MiniBusStopRepository) {}

  async execute(id: number): Promise<MiniBusStop> {
    if (!id || Number.isNaN(id)) {
      throw new ApplicationError("O id da paragem deve ser um inteiro positivo.", 422, {
        code: "INVALID_STOP_ID",
        hint: "Use GET /api/minibusstops/:id com um id numérico.",
      })
    }

    const stop = await this.repo.getById(id)
    if (!stop) {
      throw new ApplicationError(`Paragem #${id} não encontrada.`, 404, {
        code: "STOP_NOT_FOUND",
        hint: "Liste paragens em GET /api/minibusstops e confirme o id.",
      })
    }

    return stop
  }
}
