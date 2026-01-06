import { FastifyReply, FastifyRequest } from "fastify";
import { AuthService } from "./auth.service";

export class AuthController {
  static async redirectTo42(request: FastifyRequest, reply: FastifyReply) {
    const { redirect } = request?.query as { redirect: string };
    const url = await AuthService.generateAuthUrl();
    return reply.header("Location", redirect).redirect(url);
  }

  
  static async callback42(request: FastifyRequest, reply: FastifyReply) {
  const { code } = request.query as { code: string };
  const { token } = await AuthService.handleCallback(code);
  const redirect = request.headers.location;

  return reply.redirect(redirect+`?token=${token}`);
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

// export class AuthController {
//   static async redirectTo42(request: FastifyRequest, reply: FastifyReply) {
//     const redirect = request?.query?.redirect as string | undefined;
//     const url = await AuthService.generateAuthUrl();
//     return reply.redirect(url).header("Location", redirect);
//   }

//   static async callback42(request: FastifyRequest, reply: FastifyReply) {
//     const { code } = request.query as { code: string };
//     const redirect = request?.headers.location as string | undefined;

//     const profile = await AuthService.handleCallback(code);

//     return reply.redirect(redirect || '/').header("Location", redirect || '/');
