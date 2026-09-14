import { Server, Socket } from "socket.io"

let ioInstance: Server | null = null

export function getIO(): Server | null {
  return ioInstance
}

export function emitToRoute(routeId: number, event: string, payload: unknown) {
  if (!ioInstance || !routeId) return
  ioInstance.to(`route_${routeId}`).emit(event, payload)
}

export function emitToUser(role: string, userId: number, event: string, payload: unknown) {
  if (!ioInstance || !userId) return
  ioInstance.to(`user_${role.toUpperCase()}_${userId}`).emit(event, payload)
}

export function emitToAdmins(event: string, payload: unknown) {
  if (!ioInstance) return
  ioInstance.to("admins").emit(event, payload)
}

export function emitTripEvent(
  event: "trip:created" | "trip:updated",
  trip: { routeId: number; driverId: number },
) {
  emitToUser("DRIVER", trip.driverId, event, trip)
  emitToRoute(trip.routeId, event, trip)
  emitToAdmins(event, trip)
}

export function emitBoardingEvent(
  event: "boarding:request:created" | "boarding:request:updated",
  request: { routeId: number; driverId: number; cadeteId: number },
) {
  emitToUser("DRIVER", request.driverId, event, request)
  emitToUser("CADETE", request.cadeteId, event, request)
  emitToAdmins(event, request)
}
import { FastifyInstance } from "fastify"
import prisma from "../infrastructure/database/prismaClient"
import { RouteLocationState } from "../domain/routes/Route"
import { verifyToken } from "../utils/jwt"
import { env } from "../config/env"
import { isSelfOrRole } from "../plugins/auth"

const routeLocationState: Record<number, RouteLocationState> = {}
const driverLastUpdate: Record<number, number> = {}
const cadeteLastUpdate: Record<number, number> = {}

const DRIVER_TIMEOUT = 30_000 // 30 seconds
const LOCATION_THROTTLE_MS = 2_000 // 1 update every 2 seconds

interface SocketUser {
  id?: number
  role?: string
}

export function canControlDriver(user: SocketUser | undefined, driverId: number): boolean {
  return Number.isInteger(driverId) && driverId > 0 && isSelfOrRole(user, driverId, "DRIVER", ["ADMIN"])
}

export function canControlCadete(user: SocketUser | undefined, cadeteId: number): boolean {
  return Number.isInteger(cadeteId) && cadeteId > 0 && isSelfOrRole(user, cadeteId, "CADETE", ["ADMIN"])
}

export function canManageRouteSubscriptions(user: SocketUser | undefined): boolean {
  return user?.role?.toUpperCase() === "ADMIN"
}

export function getSocketCorsOrigin(configuredOrigins: string): string | string[] {
  if (configuredOrigins.trim() === "*") return "*"
  return configuredOrigins.split(",").map((origin) => origin.trim()).filter(Boolean)
}

function isDriverActive(routeId: number): boolean {
  const state = routeLocationState[routeId]
  if (!state) return false

  return state.source === "driver" && Date.now() - state.lastUpdate < DRIVER_TIMEOUT
}

export function initSocket(app: FastifyInstance) {
  const io = new Server(app.server, {
    cors: {
      origin: getSocketCorsOrigin(env.CORS_ORIGINS),
    },
    pingInterval: 10000,
    pingTimeout: 5000,
    transports: ["websocket", "polling"],
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000,
      skipMiddlewares: false,
    },
  })

  // JWT Authentication Middleware for WebSocket connections
  io.use((socket: Socket, next) => {
    try {
      const authHeader = socket.handshake.headers?.authorization
      const token =
        socket.handshake.auth?.token ||
        (authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : authHeader)

      if (!token) {
        return next(new Error("Authentication error: No token provided"))
      }

      const decoded = verifyToken(token)
      ;(socket as any).user = decoded
      next()
    } catch (err) {
      return next(new Error("Authentication error: Invalid or expired token"))
    }
  })

  ioInstance = io
  ;(app.server as any).io = io

  io.on("error", (error: any) => {
    app.log.error(error, "[Socket.IO Server Error]")
  })

  io.on("connection", (socket: Socket) => {
    const user = (socket as any).user as SocketUser
    const role = user?.role?.toUpperCase()
    const userId = Number(user?.id)
    if (role && Number.isInteger(userId) && userId > 0) {
      void socket.join(`user_${role}_${userId}`)
      if (role === "ADMIN") void socket.join("admins")
    }

    const emitValidationError = (event: string, message: string) => {
      socket.emit("socket:error", { event, message })
    }

    socket.on("ping", () => {
      socket.emit("pong")
    })

    socket.on("route:subscribe", async (data?: { routeId?: number }) => {
      const routeId = typeof data?.routeId === "number" ? data.routeId : Number.NaN
      if (!canManageRouteSubscriptions(user)) {
        emitValidationError("route:subscribe", "Only administrators can subscribe directly to routes")
        return
      }
      if (!Number.isInteger(routeId) || routeId <= 0) {
        emitValidationError("route:subscribe", "routeId must be a positive integer")
        return
      }

      await socket.join(`route_${routeId}`)
      socket.emit("route:subscribed", { routeId })
    })

    socket.on("route:unsubscribe", async (data?: { routeId?: number }) => {
      const routeId = typeof data?.routeId === "number" ? data.routeId : Number.NaN
      if (!canManageRouteSubscriptions(user)) {
        emitValidationError("route:unsubscribe", "Only administrators can unsubscribe directly from routes")
        return
      }
      if (!Number.isInteger(routeId) || routeId <= 0) {
        emitValidationError("route:unsubscribe", "routeId must be a positive integer")
        return
      }

      await socket.leave(`route_${routeId}`)
      socket.emit("route:unsubscribed", { routeId })
    })

    /**
     * Driver joins route room
     */
    socket.on("driver:joinRoute", async (data?: { driverId?: number }) => {
      try {
        const driverId = typeof data?.driverId === "number" ? data.driverId : Number.NaN
        if (!canControlDriver(user, driverId)) {
          emitValidationError("driver:joinRoute", "Drivers can only join their own route")
          return
        }

        const driver = await prisma.drivers.findUnique({
          where: { id: driverId },
        })

        if (!driver?.current_route_id) {
          return
        }

        const room = `route_${driver.current_route_id}`
        socket.join(room)
      } catch (err) {
        socket.emit("socket:error", { event: "driver:joinRoute", message: "Failed to join route" })
      }
    })

    /**
     * Driver leaves route room
     */
    socket.on("driver:leaveRoute", async (data?: { driverId?: number }) => {
      try {
        const driverId = typeof data?.driverId === "number" ? data.driverId : Number.NaN
        if (!canControlDriver(user, driverId)) {
          emitValidationError("driver:leaveRoute", "Drivers can only leave their own route")
          return
        }

        const driver = await prisma.drivers.findUnique({
          where: { id: driverId },
        })

        if (!driver?.current_route_id) {
          return
        }

        const room = `route_${driver.current_route_id}`
        socket.leave(room)

        if (
          routeLocationState[driver.current_route_id]?.source === "driver" &&
          routeLocationState[driver.current_route_id]?.sourceId === driverId
        ) {
          delete routeLocationState[driver.current_route_id]
        }
        io.to(room).emit("driver:inactive", {
          driverId,
          routeId: driver.current_route_id,
        })
      } catch (err) {
        socket.emit("socket:error", { event: "driver:leaveRoute", message: "Failed to leave route" })
      }
    })

    /**
     * Cadete joins route room
     */
    socket.on("cadete:joinRoute", async (data?: { cadeteId?: number; routeId?: number }) => {
      try {
        const cadeteId = Number(user?.id)
        if (!canControlCadete(user, cadeteId) || role !== "CADETE") {
          emitValidationError("cadete:joinRoute", "Cadetes can only join their own route")
          return
        }
        if (data?.cadeteId && data.cadeteId !== cadeteId) {
          emitValidationError("cadete:joinRoute", "cadeteId must match the authenticated user")
          return
        }

        const cadete = await prisma.cadetes.findUnique({
          where: { id: cadeteId },
          include: {
            stop: {
              include: {
                route: true,
              },
            },
          },
        })
        const cadeteRouteId = cadete?.stop?.route?.id
        if (data?.routeId && data.routeId !== cadeteRouteId) {
          emitValidationError("cadete:joinRoute", "routeId must match the cadete route")
          return
        }

        const effectiveRouteId = cadeteRouteId
        if (!effectiveRouteId) {
          return
        }

        const room = `route_${effectiveRouteId}`
        socket.join(room)

        // Apenas envia a localização ao vivo se o motorista estiver REALMENTE ativo no momento
        if (isDriverActive(effectiveRouteId)) {
          const state = routeLocationState[effectiveRouteId]
          const driverCoords = await prisma.driverCoordinates.findUnique({
            where: { id_driver: state.sourceId },
            include: { driver: true },
          })

          if (driverCoords) {
            socket.emit("driver:location", {
              id_driver: driverCoords.id_driver,
              lat: driverCoords.lat,
              long: driverCoords.long,
              routeId: effectiveRouteId,
              driverName: driverCoords.driver?.full_name || state.sourceName || "Motorista da Rota",
              isActive: true,
            })
          }
        } else {
          // Se o motorista não estiver ativo no momento, avisa o cadete explicitamente
          socket.emit("driver:inactive", {
            routeId: effectiveRouteId,
          })
        }
      } catch (err) {
        socket.emit("socket:error", { event: "cadete:joinRoute", message: "Failed to join route" })
      }
    })

    /**
     * Driver updates location
     */
    socket.on("driver:updateLocation", async (data?: { id_driver?: number; lat?: number; long?: number }) => {
      try {
        const id_driver = typeof data?.id_driver === "number" ? data.id_driver : Number.NaN
        const lat = typeof data?.lat === "number" ? data.lat : Number.NaN
        const long = typeof data?.long === "number" ? data.long : Number.NaN

        if (!canControlDriver(user, id_driver)) {
          emitValidationError("driver:updateLocation", "Drivers can only update their own location")
          return
        }

        if (!Number.isFinite(lat) || !Number.isFinite(long) || lat < -90 || lat > 90 || long < -180 || long > 180) {
          emitValidationError("driver:updateLocation", "lat and long must be valid coordinates")
          return
        }

        // Throttle check
        const now = Date.now()
        const last = driverLastUpdate[id_driver] || 0
        if (now - last < LOCATION_THROTTLE_MS) {
          return
        }
        driverLastUpdate[id_driver] = now

        const driver = await prisma.drivers.findUnique({
          where: { id: id_driver },
        })

        if (!driver) {
          socket.emit("socket:error", {
            event: "driver:updateLocation",
            message: `Driver with id ${id_driver} not found.`,
          })
          return
        }

        if (!driver.current_route_id) {
          socket.emit("socket:error", {
            event: "driver:updateLocation",
            message: "Driver is not assigned to any route.",
          })
          return
        }

        const routeId = driver.current_route_id
        routeLocationState[routeId] = {
          source: "driver",
          sourceId: driver.id,
          lastUpdate: now,
          sourceName: driver.full_name,
        }

        await prisma.driverCoordinates.upsert({
          where: { id_driver },
          update: { lat, long },
          create: { id_driver, lat, long },
        })

        const room = `route_${routeId}`
        io.to(room).emit("driver:location", {
          id_driver,
          lat,
          long,
          routeId,
          driverName: driver.full_name,
        })
      } catch (err) {
        socket.emit("socket:error", {
          event: "driver:updateLocation",
          message: "Failed to update location.",
        })
      }
    })

    /**
     * Cadete updates location (fallback when driver is inactive)
     */
    socket.on("cadete:updateLocation", async (data: { cadeteId: number; lat: number; long: number }) => {
      try {
        const { cadeteId, lat, long } = data

        if (!canControlCadete(user, cadeteId) || role !== "CADETE") {
          emitValidationError("cadete:updateLocation", "Cadetes can only update their own location")
          return
        }

        if (lat === undefined || long === undefined) {
          socket.emit("socket:error", {
            event: "cadete:updateLocation",
            message: "Missing required fields: cadeteId, lat, long",
          })
          return
        }
        if (!Number.isFinite(lat) || !Number.isFinite(long) || lat < -90 || lat > 90 || long < -180 || long > 180) {
          emitValidationError("cadete:updateLocation", "lat and long must be valid coordinates")
          return
        }

        // Throttle check
        const now = Date.now()
        const last = cadeteLastUpdate[cadeteId] || 0
        if (now - last < LOCATION_THROTTLE_MS) {
          return
        }
        cadeteLastUpdate[cadeteId] = now

        const cadete = await prisma.cadetes.findUnique({
          where: { id: cadeteId },
          include: {
            stop: {
              include: { route: true },
            },
          },
        })

        if (!cadete) {
          socket.emit("socket:error", {
            event: "cadete:updateLocation",
            message: `Cadete with id ${cadeteId} not found.`,
          })
          return
        }

        const routeId = cadete?.stop?.route?.id
        if (!routeId) {
          socket.emit("socket:error", {
            event: "cadete:updateLocation",
            message: "Cadete is not assigned to any route.",
          })
          return
        }

        if (isDriverActive(routeId)) {
          socket.emit("socket:ignored", {
            event: "cadete:updateLocation",
            message: "Driver is active on this route.",
          })
          return
        }

        routeLocationState[routeId] = {
          source: "cadete",
          sourceId: cadeteId,
          lastUpdate: now,
          sourceName: cadete.full_name,
        }

        const room = `route_${routeId}`
        io.to(room).emit("transport:location", {
          cadeteId,
          lat,
          long,
          source: "cadete",
          routeId,
          cadeteName: cadete.full_name,
        })
      } catch (err) {
        socket.emit("socket:error", {
          event: "cadete:updateLocation",
          message: "Failed to update cadete location.",
        })
      }
    })

    socket.on("disconnect", (reason) => {
      app.log.debug(`Socket disconnected: ${socket.id}, reason: ${reason}`)
    })
  })
}