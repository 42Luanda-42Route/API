import { RouteRepository } from "../../../domain/routes/RouteRepository"
import { Route } from "../../../domain/routes/Route"
import { CreateRouteInput } from "../dto"
import { ApplicationError } from "../../errors/ApplicationError"

export class CreateRouteUseCase {
  constructor(private readonly routeRepository: RouteRepository) {}

  async execute(input: CreateRouteInput): Promise<Route> {
    if (!input.routeName?.trim()) {
      throw new ApplicationError("O campo routeName é obrigatório e não pode estar vazio.", 422, {
        code: "ROUTE_NAME_REQUIRED",
        hint: "Envie { \"routeName\": \"Rota Kinaxixi - 42 Luanda\" } em POST /api/routes.",
      })
    }

    return this.routeRepository.create({
      routeName: input.routeName.trim(),
      description: input.description ?? null,
    })
  }
}
