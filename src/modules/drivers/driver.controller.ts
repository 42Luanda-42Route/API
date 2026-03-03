import { FastifyReply, FastifyRequest } from "fastify";
import { driverService } from "./driver.service";
import { routeService } from "../routes/route.service";
import bcrypt from "bcryptjs";
import { AssignRouteDTO } from "./driver.interface";
import { Driver } from "./driver.interface";
import { error } from "console";



export const driversController = {

    async getAll(req: FastifyRequest, reply: FastifyReply) {
        const drivers = await driverService.findAll();
        return reply.send(drivers).status(200);
    },

    async getById(req: FastifyRequest<{ Params: { id: number } }>, reply: FastifyReply) 
    {
        const driver = await driverService.findById(req.params.id);
        if (!driver)
            return reply.status(404).send({ message: "Driver not found" });
        const { passwrd, ...safe } = driver;
        reply.send(safe);
    },

    async create(req: FastifyRequest<{ Body: Driver; }>, reply: FastifyReply) 
    {
        const { passwrd, ...rest } = req.body;
        if (!passwrd || passwrd.length < 8) return reply.status(400).send({ message: 'Password must be at least 8 characters.' })
        
        const hashedPassword = await bcrypt.hash(passwrd, 10);
        const newDriver = await driverService.create({...rest, passwrd: hashedPassword });
        const { passwrd: _omit, ...safeDriver } = newDriver;
        reply.status(201).send(safeDriver);
    },

    async update(req: FastifyRequest<{ Params: { id: number }, Body: any }>, reply: FastifyReply) {
        const driver = await driverService.update(req.params.id, req.body);
        reply.send(driver)
    },

    async updateLocation( req: FastifyRequest<{ Params: { id: number }, Body: { lat: number, long: number } }>, reply: FastifyReply) {
        const driverLocation = await driverService.updateLocation(req.params.id, req.body);
        
        // Emitir WebSocket em tempo real
        (req.server as any).io.emit("driver:location", {
            id_driver: req.params.id,
            ...req.body
        });
        
        reply.send(driverLocation);
    },



    async delete(req: FastifyRequest<{Params: { id: number } }>, reply: FastifyReply) {
        await driverService.delete(req.params.id);
        reply.status(204).send();
    },


    async assignRoute(req: FastifyRequest<{Params: {id: number}, Body: AssignRouteDTO}>, reply: FastifyReply)
    {
        const existRoute = await routeService.getById(Number(req.body.current_route_id));
        
        if (!existRoute) return reply.status(404).send({error: `route_id: ${req.body.current_route_id} does not exist`});
        const driver =  await driverService.assignRoute(Number(req.params.id), req.body);
        reply.status(200).send(driver);
    },

    async leaveRoute(req: FastifyRequest<{Params:{id: number}}>, reply: FastifyReply)
    {
        const driver = await driverService.leaveRoute(Number(req.params.id))
        reply.send(driver);
    }

};