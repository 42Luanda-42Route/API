import { FastifyReply, FastifyRequest } from "fastify"
import { ListDriversUseCase } from "../../../application/drivers/useCases/ListDrivers"
import { GetDriverByIdUseCase } from "../../../application/drivers/useCases/GetDriverById"
import { CreateDriverUseCase } from "../../../application/drivers/useCases/CreateDriver"
import { UpdateDriverUseCase } from "../../../application/drivers/useCases/UpdateDriver"
import { DeleteDriverUseCase } from "../../../application/drivers/useCases/DeleteDriver"
import { UpdateDriverLocationUseCase } from "../../../application/drivers/useCases/UpdateDriverLocation"
import { AssignRouteUseCase } from "../../../application/drivers/useCases/AssignRoute"
import { LeaveRouteUseCase } from "../../../application/drivers/useCases/LeaveRoute"
import { LoginDriverUseCase } from "../../../application/drivers/useCases/LoginDriver"
import { ApplicationError } from "../../../application/errors/ApplicationError"
import {
  AssignRouteInput,
  CreateDriverInput,
  LoginDriverInput,
  UpdateDriverInput,
  UpdateLocationInput,
} from "../../../application/drivers/dto"

export class DriverController {
  constructor(
    private readonly listDrivers: ListDriversUseCase,
    private readonly getDriverById: GetDriverByIdUseCase,
    private readonly createDriver: CreateDriverUseCase,
    private readonly updateDriver: UpdateDriverUseCase,
    private readonly deleteDriver: DeleteDriverUseCase,
    private readonly updateLocation: UpdateDriverLocationUseCase,
    private readonly assignRoute: AssignRouteUseCase,
    private readonly leaveRoute: LeaveRouteUseCase,
    private readonly loginDriver: LoginDriverUseCase,
  ) {}

  async list(req: FastifyRequest, reply: FastifyReply) {
    try {
      const result = await this.listDrivers.execute()
      return reply.send(result)
    } catch (error) {
      return this.handle(error, reply)
    }
  }

  async getById(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const result = await this.getDriverById.execute(Number(req.params.id))
      return reply.send(result)
    } catch (error) {
      return this.handle(error, reply)
    }
  }

  async create(req: FastifyRequest<{ Body: CreateDriverInput }>, reply: FastifyReply) {
    try {
      const result = await this.createDriver.execute(req.body)
      const { passwrd, ...safe } = result
      return reply.code(201).send(safe)
    } catch (error) {
      return this.handle(error, reply)
    }
  }

  async update(req: FastifyRequest<{ Params: { id: string }; Body: UpdateDriverInput }>, reply: FastifyReply) {
    try {
      const result = await this.updateDriver.execute(Number(req.params.id), req.body)
      const { passwrd, ...safe } = result as any
      return reply.send(safe)
    } catch (error) {
      return this.handle(error, reply)
    }
  }

  async updateLocationHandler(req: FastifyRequest<{ Params: { id: string }; Body: { lat: number; long: number } }>, reply: FastifyReply) {
    try {
      const driverId = Number(req.params.id)
      const result = await this.updateLocation.execute({
        driverId,
        lat: req.body.lat,
        long: req.body.long,
      })

      // Get driver info to find their assigned route for room-scoped broadcast
      const driver = await this.getDriverById.execute(driverId)
      const routeId = driver?.currentRouteId
      const io = (req.server as any).io

      if (io && routeId) {
        // Broadcast to the specific route room (not all clients)
        io.to(`route_${routeId}`).emit("driver:location", {
          id_driver: driverId,
          lat: req.body.lat,
          long: req.body.long,
          routeId,
          driverName: driver?.fullName ?? driver?.username ?? null,
        })
      } else if (io) {
        // Fallback: if no route assigned, broadcast to all (backward compat)
        io.emit("driver:location", {
          id_driver: driverId,
          lat: req.body.lat,
          long: req.body.long,
          routeId: null,
          driverName: driver?.fullName ?? driver?.username ?? null,
        })
      }

      return reply.send(result)
    } catch (error) {
      return this.handle(error, reply)
    }
  }

  async delete(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      await this.deleteDriver.execute(Number(req.params.id))
      return reply.status(204).send()
    } catch (error) {
      return this.handle(error, reply)
    }
  }

  async assignRouteHandler(req: FastifyRequest<{ Params: { id: string }; Body: AssignRouteInput }>, reply: FastifyReply) {
    try {
      const result = await this.assignRoute.execute({
        driverId: Number(req.params.id),
        current_route_id: req.body.current_route_id,
      })
      const { passwrd, ...safe } = result as any
      return reply.send(safe)
    } catch (error) {
      return this.handle(error, reply)
    }
  }

  async leaveRouteHandler(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const driverId = Number(req.params.id)
      // Get driver info before leaving to know which route to clean up
      const driver = await this.getDriverById.execute(driverId)
      const oldRouteId = driver?.currentRouteId

      const result = await this.leaveRoute.execute(driverId)
      const { passwrd, ...safe } = result as any

      // Notify socket room that driver left (if there was a route)
      const io = (req.server as any).io
      if (io && oldRouteId) {
        io.to(`route_${oldRouteId}`).emit("driver:left", {
          driverId,
          routeId: oldRouteId,
          driverName: driver?.fullName ?? driver?.username ?? null,
        })
      }

      return reply.send(safe)
    } catch (error) {
      return this.handle(error, reply)
    }
  }

  async login(req: FastifyRequest<{ Body: LoginDriverInput }>, reply: FastifyReply) {
    try {
      const result = await this.loginDriver.execute(req.body)
      return reply.send(result)
    } catch (error) {
      return this.handle(error, reply)
    }
  }

  private handle(error: unknown, reply: FastifyReply) {
    if (error instanceof ApplicationError) {
      return reply.status(error.statusCode).send({ error: error.message })
    }
    reply.log.error(error)
    return reply.status(500).send({ error: "Internal server error" })
  }
}
