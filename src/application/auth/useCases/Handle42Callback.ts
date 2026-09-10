import OAuth2 from "simple-oauth2"
import { oauthConfig } from "../../../config/oauth42"
import { CadeteRepository } from "../../../domain/cadetes/CadeteRepository"
import { ApplicationError } from "../../errors/ApplicationError"
import { generateToken } from "../../../utils/jwt"

const client = new OAuth2.AuthorizationCode({
  client: {
    id: oauthConfig.client.id,
    secret: oauthConfig.client.secret,
  },
  auth: {
    tokenHost: oauthConfig.auth.tokenHost,
    tokenPath: oauthConfig.auth.tokenPath,
    authorizePath: oauthConfig.auth.authorizePath,
  },
})

export class Handle42CallbackUseCase {
  constructor(private readonly cadetes: CadeteRepository) {}

  async execute(code: string) {
    if (!code) {
      throw new ApplicationError("code is required", 422)
    }

    const tokenParams = {
      code,
      redirect_uri: oauthConfig.redirectUri,
      grant_type: "authorization_code" as const,
    }

    let accessToken: any
    try {
      accessToken = await client.getToken(tokenParams)
    } catch (error) {
      throw mapIntraTokenExchangeError(error)
    }
    const intraToken = accessToken.token.access_token as string

    const response = await fetch("https://api.intra.42.fr/v2/me", {
      headers: { Authorization: `Bearer ${intraToken}` },
    })

    if (!response.ok) {
      throw new ApplicationError("Erro ao buscar perfil no Intra 42", 502)
    }

    const profile = await response.json()

    const mainCursus = profile.cursus_users?.find((c: any) => c.cursus?.name === "42cursus")
    const courseName = mainCursus?.cursus?.name
    const level = mainCursus?.level
    const grade = mainCursus?.grade || null
    const avatar = {
      link:
        profile.image?.link ||
        profile.image?.versions?.medium ||
        profile.image?.versions?.small ||
        profile.image_url ||
        null,
    }
    const full_name = profile.usual_full_name || profile.displayname || profile.login

    let cadete = await this.cadetes.findByUsernameOrEmail(profile.email)
    if (!cadete && profile.login) {
      cadete = await this.cadetes.findByUsernameOrEmail(profile.login)
    }

    const isDBUser = Boolean(cadete)
    const userId = cadete?.id ?? profile.id
    const hasDistrict = Boolean(cadete?.district)
    const hasStop = Boolean(cadete?.stopId)
    const needsOnboarding = !isDBUser || !hasDistrict || !hasStop

    const jwtToken = generateToken(
      {
        id: userId,
        full_name,
        username: profile.login,
        email: profile.email,
        avatar,
        course: courseName,
        level,
        grade,
        isDBUser,
        district: cadete?.district ?? null,
        stopId: cadete?.stopId ?? null,
        hasDistrict,
        hasStop,
        needsOnboarding,
        role: "CADETE",
      },
      "7d",
    )

    return {
      token: jwtToken,
      isDBUser,
      needsOnboarding,
      hasDistrict,
      hasStop,
      cadete: cadete
        ? {
            id: cadete.id,
            fullName: cadete.fullName,
            username: cadete.username,
            email: cadete.email,
            district: cadete.district,
            stopId: cadete.stopId,
          }
        : null,
    }
  }
}

export function mapIntraTokenExchangeError(error: unknown): ApplicationError {
  if (error instanceof ApplicationError) return error

  const err = error as {
    data?: { payload?: { error?: string; error_description?: string }; statusCode?: number }
    output?: { payload?: { error?: string; error_description?: string }; statusCode?: number }
    message?: string
  }

  const oauthError = err.data?.payload?.error || err.output?.payload?.error
  const description =
    err.data?.payload?.error_description || err.output?.payload?.error_description

  if (oauthError === "invalid_client") {
    return new ApplicationError(
      "Autenticação Intra falhou: cliente OAuth inválido. Verifique FORTYTWO_CLIENT_ID e FORTYTWO_CLIENT_SECRET no ambiente.",
      502,
    )
  }

  if (oauthError === "invalid_grant") {
    return new ApplicationError(
      "Código Intra inválido ou já usado. Inicie o login novamente.",
      401,
    )
  }

  if (description) {
    return new ApplicationError(`Falha na autenticação Intra: ${description}`, 502)
  }

  return new ApplicationError("Falha na autenticação Intra. Tente novamente.", 502)
}

