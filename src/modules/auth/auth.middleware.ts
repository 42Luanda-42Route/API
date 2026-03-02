
import { FastifyRequest, FastifyReply } from "fastify";
import "@fastify/jwt";

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
    
    try {
        await request.jwtVerify();
    } catch (error) {
       return reply.status(401).send({ error: "unauthorized"});
    }
}

export async function authorizeAdmin(request: FastifyRequest, reply: FastifyReply) {
    //if (request.user.role != "ADMIN")
      //  return reply.status(403).send({"error": "Access denied"});   
}