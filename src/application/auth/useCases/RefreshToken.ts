import { ApplicationError } from "../../errors/ApplicationError"
import { authClaims, issueAuthTokens, verifyRefreshToken, verifyToken, verifyTokenAllowExpired } from "../../../utils/jwt"

export interface RefreshTokenInput {
  token?: string
  refreshToken?: string
}

const REFRESH_WINDOW_MS = 30 * 24 * 60 * 60 * 1000

export class RefreshTokenUseCase {
  async execute(input: RefreshTokenInput) {
    const rawToken = input.refreshToken || input.token

    if (!rawToken) {
      throw new ApplicationError("É obrigatório enviar token ou refreshToken.", 400, {
        code: "TOKEN_REQUIRED",
        hint: "Envie { \"refreshToken\": \"<refresh do login>\" } em POST /api/auth/refresh.",
      })
    }

    let decoded: any = null

    if (input.refreshToken) {
      try {
        decoded = verifyRefreshToken(input.refreshToken)
      } catch {
        throw new ApplicationError(
          "O refreshToken é inválido, expirou ou é um access token. Não é possível renovar a sessão.",
          401,
          {
            code: "INVALID_REFRESH_TOKEN",
            hint: "Use o campo refreshToken devolvido no login, não o token de acesso.",
          },
        )
      }
      if (decoded.tokenType !== "refresh") {
        throw new ApplicationError(
          "O valor enviado em refreshToken não é um refresh token.",
          401,
          {
            code: "INVALID_REFRESH_TOKEN",
            hint: "O refresh token tem tokenType=refresh. Volte a autenticar-se.",
          },
        )
      }
    } else {
      try {
        decoded = verifyToken(rawToken)
      } catch {
        try {
          decoded = verifyTokenAllowExpired(rawToken)
        } catch {
          throw new ApplicationError("Token inválido ou expirado.", 401, {
            code: "INVALID_TOKEN",
            hint: "Inicie sessão novamente. Se tiver refreshToken, envie-o em vez do access token.",
          })
        }
        if (decoded.tokenType === "refresh") {
          throw new ApplicationError("Token inválido ou expirado.", 401, {
            code: "INVALID_TOKEN",
            hint: "Este endpoint aceita access token expirado no campo token, ou um refreshToken válido.",
          })
        }
        const expiredAt = Number(decoded.exp || 0) * 1000
        if (!expiredAt || Date.now() - expiredAt > REFRESH_WINDOW_MS) {
          throw new ApplicationError("Token inválido ou expirado.", 401, {
            code: "TOKEN_REFRESH_WINDOW_EXPIRED",
            hint: "O access token expirou há mais de 30 dias. Inicie sessão novamente.",
          })
        }
      }
    }

    if (!decoded || !decoded.id) {
      throw new ApplicationError("Payload de autenticação inválido.", 401, {
        code: "INVALID_AUTH_PAYLOAD",
        hint: "O JWT tem de incluir id e role. Volte a autenticar-se.",
      })
    }

    return issueAuthTokens(authClaims(decoded))
  }
}
