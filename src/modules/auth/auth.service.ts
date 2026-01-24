import { oauthConfig } from "./auth.config";
import OAuth2 from "simple-oauth2";
import {IntraProfile, IUser} from "../cadetes/cadete.interface"
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
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
});

export class AuthService {
  static async generateAuthUrl(redirect: string): Promise<string> {
    const authorizationUri = client.authorizeURL({
      redirect_uri: oauthConfig.redirectUri,
      scope: "public",
      state: redirect,
    });
    return authorizationUri;
  }

    static async handleCallback(code: string) {
          const tokenParams = {
            code,
            redirect_uri: oauthConfig.redirectUri,
            grant_type: "authorization_code",
            
          };

          console.log("\n\n\n"+oauthConfig.redirectUri+"\n\\n\n");
          
          const accessToken: any = await client.getToken(tokenParams);
          const intraToken = accessToken.token.access_token as string;

          const response = await fetch("https://api.intra.42.fr/v2/me", {
            headers: { Authorization: `Bearer ${intraToken}` },
          });

          if (!response.ok) {
            throw new Error("Erro ao buscar perfil no Intra 42");
          }

          const profile = await response.json();

          // 🔐 JWT DA TUA API (não do Intra)
          const jwtToken = jwt.sign(
            {
              sub: profile.id,
              username: profile.login,
              email: profile.email,
            },
            process.env.JWT_SECRET as string,
            { expiresIn: "15m" }
          );

          return {
            user: {
              name: profile.usual_full_name,
              username: profile.login,
              email: profile.email,
              id: profile.id,
            },
            token: jwtToken,
          };
        }

}
