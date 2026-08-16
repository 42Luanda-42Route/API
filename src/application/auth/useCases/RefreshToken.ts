import { ApplicationError } from "../../errors/ApplicationError"
import { generateRefreshToken, generateToken, verifyRefreshToken, verifyToken } from "../../../utils/jwt"

export interface RefreshTokenInput {
  token?: string
  refreshToken?: string
}

export class RefreshTokenUseCase {
  async execute(input: RefreshTokenInput) {
    const rawToken = input.refreshToken || input.token

    if (!rawToken) {
      throw new ApplicationError("Token ou Refresh Token é obrigatório.", 400)
    }

    let decoded: any = null
    try {
      if (input.refreshToken) {
        decoded = verifyRefreshToken(input.refreshToken)
      } else {
        decoded = verifyToken(rawToken)
      }
    } catch {
      try {
        decoded = verifyToken(rawToken)
      } catch {
        throw new ApplicationError("Token inválido ou expirado.", 401)
      }
    }

    if (!decoded || !decoded.id) {
      throw new ApplicationError("Payload de autenticação inválido.", 401)
    }

    const payload = {
      id: decoded.id,
      email: decoded.email,
      username: decoded.username,
      full_name: decoded.full_name,
      role: decoded.role || "CADETE",
      currentRouteId: decoded.currentRouteId || decoded.current_route_id,
      stopId: decoded.stopId || decoded.stop_id,
      district: decoded.district,
    }

    const newToken = generateToken(payload)
    const newRefreshToken = generateRefreshToken(payload)

    return {
      token: newToken,
      refreshToken: newRefreshToken,
      user: payload,
    }
  }
}
