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

    const accessToken: any = await client.getToken(tokenParams)
    const intraToken = accessToken.token.access_token as string

    const response = await fetch("https://api.intra.42.fr/v2/me", {
      headers: { Authorization: `Bearer ${intraToken}` },
    })

    if (!response.ok) {
      throw new ApplicationError("Erro ao buscar perfil no Intra 42", 502)
    }

    const profile = await response.json()

    const mainCursus = profile.cursus_users.find((c: any) => c.cursus.name === "42cursus")
    const courseName = mainCursus?.cursus?.name
    const level = mainCursus?.level
    const grade = mainCursus?.grade
    const avatar = { link: profile.image.link }
    const full_name = profile.usual_full_name

    const cadete = await this.cadetes.findByUsernameOrEmail(profile.email)
    const isUser = Boolean(cadete)
    const userId = cadete?.id ?? profile.id

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
        isDBUser: isUser,
        role: "CADETE",
      },
      "15m",
    )

    return { token: jwtToken }
  }
}
