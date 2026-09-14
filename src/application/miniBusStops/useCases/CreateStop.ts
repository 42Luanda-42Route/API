import { MiniBusStopRepository } from "../../../domain/miniBusStops/MiniBusStopRepository"
import { RouteRepository } from "../../../domain/routes/RouteRepository"
import { MiniBusStop } from "../../../domain/miniBusStops/MiniBusStop"
import { CreateStopInput } from "../dto"
import { ApplicationError } from "../../errors/ApplicationError"

export class CreateStopUseCase {
  constructor(private readonly repo: MiniBusStopRepository, private readonly routes: RouteRepository) {}

  async execute(input: CreateStopInput): Promise<MiniBusStop> {
    if (!input.route_id || Number.isNaN(input.route_id)) {
      throw new ApplicationError("O campo route_id é obrigatório e deve ser um inteiro positivo.", 422, {
        code: "INVALID_ROUTE_ID",
        hint: "Envie { \"route_id\": <id de uma rota existente> } em POST /api/minibusstops.",
      })
    }

    if (input.latitude !== undefined && input.latitude !== null && (input.latitude < -90 || input.latitude > 90)) {
      throw new ApplicationError(`A latitude ${input.latitude} é inválida. Deve estar entre -90 e 90.`, 422, {
        code: "INVALID_LATITUDE",
        hint: "Envie latitude entre -90 e 90, ou omita o campo.",
      })
    }

    if (input.longitude !== undefined && input.longitude !== null && (input.longitude < -180 || input.longitude > 180)) {
      throw new ApplicationError(`A longitude ${input.longitude} é inválida. Deve estar entre -180 e 180.`, 422, {
        code: "INVALID_LONGITUDE",
        hint: "Envie longitude entre -180 e 180, ou omita o campo.",
      })
    }

    const route = await this.routes.getById(input.route_id)
    if (!route) {
      throw new ApplicationError(
        `A rota #${input.route_id} não existe. Não é possível criar a paragem nessa rota.`,
        404,
        {
          code: "ROUTE_NOT_FOUND",
          hint: "Liste rotas em GET /api/routes e use um route_id válido.",
        },
      )
    }

    return this.repo.create({
      stopName: input.stop_name ?? null,
      district: input.district ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      description: input.description ?? null,
      routeId: input.route_id,
    })
  }
}
