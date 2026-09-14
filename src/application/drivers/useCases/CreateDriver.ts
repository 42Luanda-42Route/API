import bcrypt from "bcryptjs"
import { DriverRepository } from "../../../domain/drivers/DriverRepository"
import { Driver } from "../../../domain/drivers/Driver"
import { CreateDriverInput } from "../dto"
import { ApplicationError } from "../../errors/ApplicationError"

export class CreateDriverUseCase {
  constructor(private readonly repo: DriverRepository) {}

  async execute(input: CreateDriverInput): Promise<Driver> {
    if (!input.password || input.password.length < 8) {
      throw new ApplicationError("A password do motorista deve ter pelo menos 8 caracteres.", 422, {
        code: "PASSWORD_TOO_SHORT",
        hint: "Envie { \"password\": \"...\" } com 8 ou mais caracteres em POST /api/drivers.",
      })
    }

    if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
      throw new ApplicationError(`O email «${input.email}» não é válido.`, 422, {
        code: "INVALID_EMAIL",
        hint: "Use um email no formato nome@dominio.tld.",
      })
    }

    if (input.username || input.email) {
      const existing = await this.repo.findByUsernameOrEmail(input.username || input.email || "")
      if (existing) {
        throw new ApplicationError(
          `Já existe um motorista com username «${input.username ?? existing.username}» ou email «${input.email ?? existing.email}».`,
          409,
          {
            code: "DRIVER_ALREADY_EXISTS",
            hint: "Escolha outro username/email ou atualize o motorista existente com PUT /api/drivers/:id.",
          },
        )
      }
    }

    const hashed = await bcrypt.hash(input.password, 10)
    return this.repo.create({
      fullName: input.full_name ?? null,
      username: input.username ?? null,
      email: input.email ?? null,
      password: hashed,
      photo: input.photo ?? null,
      phone: input.phone ?? null,
      currentRouteId: null,
    })
  }
}
