import { oauthConfig } from "./auth.config";
import OAuth2 from "simple-oauth2";
import { cadeteService } from "../cadetes/cadete.service";
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
          
          const accessToken: any = await client.getToken(tokenParams);
          const intraToken = accessToken.token.access_token as string;

          const response = await fetch("https://api.intra.42.fr/v2/me", {
            headers: { Authorization: `Bearer ${intraToken}` },
          });

          if (!response.ok) {
            throw new Error("Erro ao buscar perfil no Intra 42");
          }

          const profile = await response.json();

          const mainCursus = profile.cursus_users.find( (c: any) => c.cursus.name === "42cursus");
          const courseName = mainCursus?.cursus?.name;
          const level = mainCursus?.level;
          const grade = mainCursus?.grade;
          const avatar = { link: profile.image.link };
          const full_name =  profile.usual_full_name
          
          console.log("\n\n\nLevel: ", profile.level);
          console.log("\n\n\n\ngrade", grade);
          console.log("\n\n\n");

          const cadete = await cadeteService.findByUsernameOrEmail(profile.email);
          let isUser = true;
          if (!cadete) isUser = false;
          
          if (cadete) profile.id = cadete.id;

          const jwtToken = jwt.sign(
            {
              id: profile.id,
              full_name: full_name,
              username: profile.login,
              email: profile.email,
              avatar: avatar,
              course: courseName,
              level: level,
              grade: grade,
              isDBUser: isUser
            },
            process.env.JWT_SECRET as string,
            { expiresIn: "15m" }
          );

          return {token: jwtToken };
  }

}
