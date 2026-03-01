import { FastifyReply, FastifyRequest } from "fastify";
import { cadeteService } from "./cadete.service";
import bcrypt from "bcryptjs";


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
         const { passwrd, ...safe } = cadete;
        reply.send(safe);
    },

    async create(req: FastifyRequest<{ Body: {
        full_name?: string;
        username: string;
        email: string;
        passwrd: string;
        city?: string;
        distrit?: string;
        phone?: number;
        stop_id?: number;
        };
    }>, 
    reply: FastifyReply) {
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

    async login(
    req: FastifyRequest<{ Body: { usernameOrEmail: string; passwrd: string } }>,
    reply: FastifyReply
  ) {
    const { usernameOrEmail, passwrd } = req.body
    const user = await cadeteService.findByUsernameOrEmail(usernameOrEmail)

    if (!user) return reply.status(401).send({ message: 'Credenciais inválidas' })

    const ok = await bcrypt.compare(passwrd, user.passwrd ?? '')
    if (!ok) return reply.status(401).send({ message: 'Credenciais inválidas' })

    const { passwrd: _omit, ...safe } = user
    return reply.send({ user: safe /*, token*/ })
  }
};