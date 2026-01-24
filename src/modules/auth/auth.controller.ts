import { FastifyReply, FastifyRequest } from "fastify";
import { AuthService } from "./auth.service";
import { log } from "console";

export class AuthController {
  static async redirectTo42(request: FastifyRequest, reply: FastifyReply) {
    const { redirect } = request.query as { redirect: string };
    let url = await AuthService.generateAuthUrl(redirect);
    
    return reply.redirect(url);
  }

  
    static async callback42(request: FastifyRequest, reply: FastifyReply) {
      try {
       const { code, state } = request.query as { code: string, state: string};
      //const  mobileRedirectURL =  request.params;
      console.log("YYYYYYYYYYYYYY:"+state);

      const { user, token } = await AuthService.handleCallback(code);

      // 🔗 DEEP LINK DO APP
      const redirectUrl = state+`?token=${token}`;
      console.log("SUCCESSS"+redirectUrl);
      
      return reply.redirect(redirectUrl); 
      } catch (error) {
        console.log(error);
        
      }
}

// Redirect URI do INTRA
 // 42Routes://auth
//https://four2routeapi.onrender.com/api/auth/42/callback
  
    /*static async callback42(request: FastifyRequest, reply: FastifyReply) {
    const { code } = request.query as { code: string };
    //const { user, token } = await AuthService.handleCallback(code);
    const { token } = await AuthService.handleCallback(code);
    //return reply.send({ user, token });
    
    console.log(token);
    return reply.send({token });
  }*/
}
