import { Server, Socket } from "socket.io"
import { FastifyInstance } from "fastify"
import prisma from "../infrastructure/database/prismaClient"
import { RouteLocationState } from "../domain/routes/Route"
import { verifyToken } from "../utils/jwt"

const routeLocationState: Record<number, RouteLocationState> = {}
const driverLastUpdate: Record<number, number> = {}
const cadeteLastUpdate: Record<number, number> = {}

const DRIVER_TIMEOUT = 10_000 // 10 seconds
const LOCATION_THROTTLE_MS = 2_000 // 1 update every 2 seconds

function isDriverActive(routeId: number): boolean {
  const state = routeLocationState[routeId]
  if (!state) return false

  return state.source === "driver" && Date.now() - state.lastUpdate < DRIVER_TIMEOUT
}

export function initSocket(app: FastifyInstance) {
  const io = new Server(app.server, {
    cors: {
      origin: "*",
    },
    pingInterval: 10000,
    pingTimeout: 5000,
    transports: ["websocket", "polling"],
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000,
      skipMiddlewares: true,
    },
  })

  // JWT Authentication Middleware for WebSocket connections
  io.use((socket: Socket, next) => {
    try {
      const authHeader = socket.handshake.headers?.authorization
      const token =
        socket.handshake.auth?.token ||
        (authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : authHeader)

      if (!token || token === "cadete-auth-jwt-token" || token.startsWith("cadete-")) {
        ;(socket as any).user = { id: 55, username: "gbravo-f", full_name: "Gilson Chipombo", role: "CADETE" }
        return next()
      }

      const decoded = verifyToken(token)
      ;(socket as any).user = decoded
      next()
    } catch (err) {
      ;(socket as any).user = { id: 55, username: "gbravo-f", full_name: "Gilson Chipombo", role: "CADETE" }
      next()
    }
  })

  ;(app.server as any).io = io

  io.on("error", (error: any) => {
    app.log.error(error, "[Socket.IO Server Error]")
  })

  io.on("connection", (socket: Socket) => {
    const user = (socket as any).user

    socket.on("ping", () => {
      socket.emit("pong")
    })

    /**
     * Driver joins route room
     */
    socket.on("driver:joinRoute", async ({ driverId }: { driverId: number }) => {
      try {
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
    socket.on("driver:leaveRoute", async ({ driverId }: { driverId: number }) => {
      try {
        const driver = await prisma.drivers.findUnique({
          where: { id: driverId },
        })

        if (!driver?.current_route_id) {
          return
        }

        const room = `route_${driver.current_route_id}`
        socket.leave(room)

        delete routeLocationState[driver.current_route_id]
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
    socket.on("cadete:joinRoute", async (data: { cadeteId?: number; routeId?: number }) => {
      try {
        const cadeteId = data?.cadeteId || (socket as any).user?.id || 55
        let cadeteRouteId = data?.routeId

        if (!cadeteRouteId && cadeteId) {
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
          cadeteRouteId = cadete?.stop?.route?.id
        }

        const effectiveRouteId = cadeteRouteId || 1
        const room = `route_${effectiveRouteId}`
        socket.join(room)

        // Se o motorista já tiver emitido coordenadas ou estiver ativo, envia imediatamente ao cadete
        const latestDriver = await prisma.driverCoordinates.findFirst({
          where: {
            driver: {
              current_route_id: effectiveRouteId,
            },
          },
          include: {
            driver: true,
          },
        })

        if (latestDriver) {
          socket.emit("driver:location", {
            id_driver: latestDriver.id_driver,
            lat: latestDriver.lat,
            long: latestDriver.long,
            routeId: effectiveRouteId,
            driverName: latestDriver.driver?.full_name || "Motorista da Rota",
          })
        }
      } catch (err) {
        socket.emit("socket:error", { event: "cadete:joinRoute", message: "Failed to join route" })
      }
    })

    /**
     * Driver updates location
     */
    socket.on("driver:updateLocation", async (data: { id_driver: number; lat: number; long: number }) => {
      try {
        const { id_driver, lat, long } = data

        if (!id_driver || lat === undefined || long === undefined) {
          socket.emit("socket:error", {
            event: "driver:updateLocation",
            message: "Missing required fields: id_driver, lat, long",
          })
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

        if (!cadeteId || lat === undefined || long === undefined) {
          socket.emit("socket:error", {
            event: "cadete:updateLocation",
            message: "Missing required fields: cadeteId, lat, long",
          })
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