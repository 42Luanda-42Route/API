import { ApplicationError } from "../../errors/ApplicationError"
import { encryptQrPayload } from "../../../utils/qrCipher"
import { env } from "../../../config/env"
import { CadeteQrPayload, GenerateCadeteQrInput } from "../dto"
import { CadeteRepository } from "../../../domain/cadetes/CadeteRepository"

export class GenerateCadeteQrUseCase {
  constructor(private readonly cadetes: CadeteRepository) {}

  async execute(input: GenerateCadeteQrInput): Promise<{ qr: string; expiresAt: string; cadeteId: number }> {
    if (input.role !== "CADETE") {
      throw new ApplicationError(
        `O perfil ${input.role || "desconhecido"} não pode gerar QR de identificação de cadete.`,
        403,
        {
          code: "FORBIDDEN_ROLE",
          hint: "Autentique-se como CADETE em POST /api/qr/cadete/generate.",
        },
      )
    }
    if (!input.cadeteId || Number.isNaN(input.cadeteId)) {
      throw new ApplicationError("O id do cadete deve ser um inteiro positivo.", 422, {
        code: "INVALID_CADETE_ID",
        hint: "O JWT do cadete deve ter o id da tabela Cadetes.",
      })
    }

    const cadete = await this.cadetes.getById(input.cadeteId)
    if (!cadete) {
      throw new ApplicationError(`Cadete #${input.cadeteId} não encontrado. Não é possível gerar o QR.`, 404, {
        code: "CADETE_NOT_FOUND",
        hint: "Confirme o id do JWT em GET /api/cadetes/:id.",
      })
    }

    const iat = Math.floor(Date.now() / 1000)
    const exp = iat + env.QR_BOARDING_TTL_SECONDS

    const payload: CadeteQrPayload = {
      type: "cadete",
      cadeteId: cadete.id,
      iat,
      exp,
    }

    return {
      qr: encryptQrPayload(JSON.stringify(payload)),
      expiresAt: new Date(exp * 1000).toISOString(),
      cadeteId: cadete.id,
    }
  }
}
