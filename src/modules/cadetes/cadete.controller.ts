import { FastifyReply, FastifyRequest } from "fastify";
import { cadeteService } from "./cadete.service";
import bcrypt from "bcryptjs";
import { Cadete } from "./cadete.interface";


export const cadetesController = {

    async getRouteById(req: FastifyRequest<{Params: {id: number}}>, reply: FastifyReply)
    {
        const routeId = await cadeteService.getCadeteRouteId(req.params.id);

        if (!routeId) return reply.status(404).send({error: "Cadete nao encontrado ou nao associado a nenhuma rota"})
        return reply.status(200).send(routeId);
    },

    async getAll(req: FastifyRequest, reply: FastifyReply) {
        const cadetes = await cadeteService.findAll();
        return reply.status(201).send(cadetes)
    },

    async getById(req: FastifyRequest<{ Params: { id: number } }>, reply: FastifyReply) {
        const cadete = await cadeteService.findById(req.params.id);
        if (!cadete)
            return reply.status(404).send({ message: "Cadete não encontrado" });
        reply.send(cadete);
    },

    async create(req: FastifyRequest<{ Body: Cadete }>, reply: FastifyReply)
    {
        const { passwrd, ...rest } = req.body;
        if (!passwrd || passwrd.length < 8)
            return reply.status(400).send({ message: 'Senha deve ter pelo menos 8 caracteres.' })
        
        const hashedPassword = await bcrypt.hash(passwrd, 10);
        const newCadete = await cadeteService.create({...rest, passwrd: hashedPassword });
        const { passwrd: _omit, ...safeCadete } = newCadete;
        reply.status(201).send(safeCadete);
    },

    async update(req: FastifyRequest<{ Params: { id: number }, Body: any }>, reply: FastifyReply) {
        const cadete = await cadeteService.update(req.params.id, req.body);
        reply.send(cadete)
    },
    async delete(req: FastifyRequest<{Params: { id: number } }>, reply: FastifyReply) {
        await cadeteService.delete(req.params.id);
        reply.status(204).send();
    },
};