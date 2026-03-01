import { FastifyReply, FastifyRequest } from "fastify";
import { AuthService } from "./auth.service";
import { driverService } from "../drivers/driver.service";
import { loginDriver } from "../drivers/driver.interface";
import { adminService } from "../admins/admin.service";
import { loginAdmin } from "../admins/admin.interface";

export class AuthController {
  static async redirectTo42(request: FastifyRequest, reply: FastifyReply) 
  {
    const { redirect } = request.query as { redirect: string };
    let url = await AuthService.generateAuthUrl(redirect);
    
    return reply.redirect(url);
  }

  
  static async callback42(request: FastifyRequest, reply: FastifyReply) {
  

      console.log("Callback recebido com query: ", request.query);
      const { code, state } = request.query as { code: string, state: string};
      const { token } = await AuthService.handleCallback(code);

      //DEEP LINK DO APP
      const redirectUrl = state;
      console.log("SUCCESSS"+redirectUrl);
      
      try {
        return reply.redirect(`${redirectUrl}?token=${token}`); 
      } catch (error) {
        console.log("Deu erro: ", error);
      }
  }

  static async loginDriver(req: FastifyRequest<{ Body: loginDriver}>, reply: FastifyReply)
  {
    const {username, password, email} = req.body;
    const driver = await driverService.login(username, password)

    if (!driver) return reply.send({"message": "User or email not found"}).status(404);

    return driver;
  }

   static async loginAdmin( req: FastifyRequest<{ Body: loginAdmin }>, reply: FastifyReply ) 
   {
      const { username, password, email } = req.body;
      const admin = await adminService.login(username, password)

      if (!admin) return reply.send({"message": "User or email not found"}).status(404);

      return admin;
   }

}
