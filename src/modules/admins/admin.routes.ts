import { FastifyInstance } from "fastify";
import { adminsController } from "./admin.controller";
import { autoDocs } from '../../utils/docs';
import { authenticate } from "../auth/auth.middleware";
const docs = autoDocs('Admins', 'Administrators');

export default async function adminRoutes(app: FastifyInstance) {

    // app.addHook("preHandler", async (request, reply) => {
    //     const authHeader = request.headers.authorization;
    //     if (!authHeader) {
    //         return reply.status(401).send({ error: "Unauthorized" });
    //     }
    //     const token = authHeader.split(" ")[1];
    //     try {
    //         const decoded: any = await app.jwt.verify(token);
    //         if (decoded.role !== "ADMIN") {
    //             return reply.status(403).send({ error: "Forbidden" });
    //         }
    //     } catch (err) {
    //         return reply.status(401).send({ error: "Invalid token" });
    //     }
    // });

    app.addHook("preHandler", authenticate);
    
    app.get('/admins',{ schema: docs.list },  adminsController.getAll);
    app.get('/admins/:id', { schema: docs.get }, adminsController.getById);
    app.post('/admin', { schema: docs.create }, adminsController.create);
    app.put('/admins/:id', { schema: docs.update }, adminsController.update);
    app.delete('/admins/:id',{ schema: docs.delete },  adminsController.delete);
}
