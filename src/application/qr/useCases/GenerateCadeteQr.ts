import { ApplicationError } from "../../errors/ApplicationError"
import { encryptQrPayload } from "../../../utils/qrCipher"
import { env } from "../../../config/env"
import { CadeteQrPayload, GenerateCadeteQrInput } from "../dto"
import { CadeteRepository } from "../../../domain/cadetes/CadeteRepository"

export class GenerateCadeteQrUseCase {
  constructor(private readonly cadetes: CadeteRepository) {}

  async execute(input: GenerateCadeteQrInput): Promise<{ qr: string; expiresAt: string; cadeteId: number }> {
    if (input.role !== "CADETE") {
      throw new ApplicationError("Apenas cadetes podem gerar o seu QR de identificação", 403)
    }
    if (!input.cadeteId || Number.isNaN(input.cadeteId)) {
      throw new ApplicationError("Cadete id must be valid", 422)
    }

    const cadete = await this.cadetes.getById(input.cadeteId)
    if (!cadete) {
      throw new ApplicationError("Cadete não encontrado", 404)
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
