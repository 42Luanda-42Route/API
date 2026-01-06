import { FastifyReply, FastifyRequest } from "fastify";
import { AuthService } from "./auth.service";

export class AuthController {
  static async redirectTo42(request: FastifyRequest, reply: FastifyReply) {
    const url = await AuthService.generateAuthUrl();
    return reply.redirect(url);
  }

  
    static async callback42(request: FastifyRequest, reply: FastifyReply) {
  const { code } = request.query as { code: string };

  const { user, token } = await AuthService.handleCallback(code);

  // 🔗 DEEP LINK DO APP
  const redirectUrl = `exp://10.12.4.9:8081/--/auth/42/callback?token=${token}`;

  return reply.redirect(redirectUrl);
}

    /*static async callback42(request: FastifyRequest, reply: FastifyReply) {
    const { code } = request.query as { code: string };
    //const { user, token } = await AuthService.handleCallback(code);
    const { token } = await AuthService.handleCallback(code);
    //return reply.send({ user, token });
    
    console.log(token);
    return reply.send({token });
  }*/
}
