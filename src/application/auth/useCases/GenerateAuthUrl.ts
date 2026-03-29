import OAuth2 from "simple-oauth2"
import { oauthConfig } from "../../../config/oauth42"

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

export class GenerateAuthUrlUseCase {
  async execute(redirect: string): Promise<string> {
    const authorizationUri = client.authorizeURL({
      redirect_uri: oauthConfig.redirectUri,
      scope: "public",
      state: redirect,
    })
    return authorizationUri
  }
}
