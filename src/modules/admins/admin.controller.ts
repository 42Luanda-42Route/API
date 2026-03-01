import { FastifyReply, FastifyRequest } from "fastify";
import { adminService } from "./admin.service";
import bcrypt from "bcryptjs";
import { Admin, loginAdmin } from "./admin.interface";


export const adminsController = {

    async getAll(req: FastifyRequest, reply: FastifyReply) 
    {
        const admins = await adminService.findAll();
        return reply.send(admins)
    },

    async getById(req: FastifyRequest<{ Params: { id: number } }>, reply: FastifyReply) 
    {
        const admin = await adminService.findById(req.params.id);
        if (!admin) return reply.status(404).send({ message: "admin não encontrado" });
        reply.send(admin);
    },

    async create(req: FastifyRequest<{ Body: Admin }>,  reply: FastifyReply) {
        const { password, ...rest } = req.body;
        if (!password || password.length < 8) return reply.status(400).send({ message: 'Senha deve ter pelo menos 8 caracteres.' })
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const newadmin = await adminService.create({...rest, password: hashedPassword });
        //const { password: _omit, ...safeadmin } = newadmin;
        reply.status(201).send(newadmin);
    },

    async update(req: FastifyRequest<{ Params: { id: number }, Body: any }>, reply: FastifyReply) {
        const admin = await adminService.update(req.params.id, req.body);
        reply.send(admin)
    },
    async delete(req: FastifyRequest<{Params: { id: number } }>, reply: FastifyReply) {
        await adminService.delete(req.params.id);
        reply.status(204).send();
    },
};