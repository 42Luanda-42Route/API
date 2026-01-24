export const oauthConfig = {
  client: {
    id: process.env.FORTYTWO_CLIENT_ID as string,
    secret: process.env.FORTYTWO_CLIENT_SECRET as string,
    
  },
  auth: {
    tokenHost: "https://api.intra.42.fr",
    tokenPath: "/oauth/token",
    authorizePath: "/oauth/authorize",
  },
  options: {
    authorizationMethod: "body",
  },
  redirectUri: process.env.APP_URL + "/api/auth/42/callback",
 
};