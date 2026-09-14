import { FastifyInstance } from "fastify"
import { buildApp } from "../../app"
import { generateToken } from "../../utils/jwt"
import { env } from "../../config/env"

describe("E2E API Endpoints Test", () => {
  let app: FastifyInstance
  let adminToken: string
  let cadeteToken: string
  let driverToken: string

  beforeAll(async () => {
    app = await buildApp()
    await app.ready()

    adminToken = generateToken({ id: 1, username: "admin", role: "ADMIN" })
    cadeteToken = generateToken({ id: 1, username: "cadete", role: "CADETE" })
    driverToken = generateToken({ id: 1, username: "driver", role: "DRIVER" })

    // Mock prisma queries so tests are fast & reliable without live database
    if (app.prisma) {
      jest.spyOn(app.prisma.drivers, "findFirst").mockResolvedValue(null as any)
      jest.spyOn(app.prisma.admins, "findFirst").mockResolvedValue(null as any)
      jest.spyOn(app.prisma.admins, "findMany").mockResolvedValue([] as any)
      jest.spyOn(app.prisma.admins, "count").mockResolvedValue(0)
      jest.spyOn(app.prisma.cadetes, "findMany").mockResolvedValue([] as any)
      jest.spyOn(app.prisma.cadetes, "findUnique").mockResolvedValue(null as any)
      jest.spyOn(app.prisma.cadetes, "count").mockResolvedValue(0)
      jest.spyOn(app.prisma.drivers, "findUnique").mockResolvedValue(null as any)
      jest.spyOn(app.prisma.drivers, "findMany").mockResolvedValue([] as any)
      jest.spyOn(app.prisma.drivers, "count").mockResolvedValue(0)
      jest.spyOn(app.prisma.route, "findMany").mockResolvedValue([] as any)
      jest.spyOn(app.prisma.route, "count").mockResolvedValue(0)
      jest.spyOn(app.prisma.route, "findUnique").mockResolvedValue({
        id: 1,
        route_name: "Route 1",
        description: null,
        createdAt: new Date(),
        stops: [],
        drivers: [],
      } as any)
      jest.spyOn(app.prisma.route, "update").mockResolvedValue({
        id: 1,
        route_name: "Updated Route",
        description: null,
        createdAt: new Date(),
      } as any)
      jest.spyOn(app.prisma.route, "delete").mockResolvedValue({ id: 1 } as any)
      jest.spyOn(app.prisma.miniBusStop, "findMany").mockResolvedValue([] as any)
      jest.spyOn(app.prisma.miniBusStop, "count").mockResolvedValue(0)
      jest.spyOn(app.prisma.trip, "count").mockResolvedValue(0)
      jest.spyOn(app.prisma.trip, "deleteMany").mockResolvedValue({ count: 0 } as any)
      jest.spyOn(app.prisma.chat, "findMany").mockResolvedValue([] as any)
      jest.spyOn(app.prisma.chat, "count").mockResolvedValue(0)
      jest.spyOn(app.prisma, "$transaction").mockImplementation(async (fn: any) =>
        fn({
          trip: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
          route: { delete: jest.fn().mockResolvedValue({ id: 1 }) },
          drivers: { delete: jest.fn().mockResolvedValue({ id: 1 }) },
        }),
      )
    }
  })

  afterAll(async () => {
    if (app) {
      await app.close()
    }
  })

  describe("GET /api/health", () => {
    it("should return health status", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/health",
      })

      expect([200, 503]).toContain(response.statusCode)
      const body = JSON.parse(response.body)
      expect(body).toHaveProperty("status")
      expect(body).toHaveProperty("database")
    })
  })

  describe("Swagger Documentation Basic Auth Protection", () => {
    it("GET /api/docs should return 401 without Basic Auth", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/docs",
      })

      expect(response.statusCode).toBe(401)
      expect(response.headers["www-authenticate"]).toContain("Basic")
    })

    it("GET /api/docs should return 401 with invalid credentials", async () => {
      const invalidAuth = Buffer.from("wrong:wrong").toString("base64")
      const response = await app.inject({
        method: "GET",
        url: "/api/docs",
        headers: {
          authorization: `Basic ${invalidAuth}`,
        },
      })

      expect(response.statusCode).toBe(401)
    })

    it("GET /api/docs should allow access with valid Basic Auth", async () => {
      const validAuth = Buffer.from(`${env.SWAGGER_USER}:${env.SWAGGER_PASSWORD}`).toString("base64")
      const response = await app.inject({
        method: "GET",
        url: "/api/docs",
        headers: {
          authorization: `Basic ${validAuth}`,
        },
      })

      expect([200, 302]).toContain(response.statusCode)
    })
  })

  describe("CORS preflight", () => {
    it("OPTIONS /api/drivers/:id allows PUT, PATCH and DELETE", async () => {
      const response = await app.inject({
        method: "OPTIONS",
        url: "/api/drivers/3",
        headers: {
          origin: "http://localhost:5173",
          "access-control-request-method": "PUT",
          "access-control-request-headers": "authorization,content-type",
        },
      })

      expect(response.statusCode).toBe(204)
      const allow = String(response.headers["access-control-allow-methods"] || "").toUpperCase()
      expect(allow).toContain("PUT")
      expect(allow).toContain("DELETE")
      expect(allow).toContain("PATCH")
    })
  })

  describe("Protected Routes Authentication Check", () => {
    it("POST /api/admins should return 401 without token", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/admins",
        payload: { username: "test", password: "password123" },
      })
      expect(response.statusCode).toBe(401)
    })

    it("POST /api/cadetes should return 401 without token", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/cadetes",
        payload: { username: "test" },
      })
      expect(response.statusCode).toBe(401)
    })

    it("POST /api/drivers should return 401 without token", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/drivers",
        payload: { username: "test", password: "password123" },
      })
      expect(response.statusCode).toBe(401)
    })

    it("POST /api/minibusstops should return 401 without token", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/minibusstops",
        payload: { stop_name: "test", route_id: 1 },
      })
      expect(response.statusCode).toBe(401)
    })

    it("POST /api/routes should return 401 without token", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/routes",
        payload: { route_name: "test" },
      })
      expect(response.statusCode).toBe(401)
    })
  })

  describe("Role-based route authorization", () => {
    it("rejects non-admin route mutations", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/routes/1",
        headers: { authorization: `Bearer ${cadeteToken}` },
        payload: { description: "Unauthorized change" },
      })

      expect(response.statusCode).toBe(403)
      const body = JSON.parse(response.body)
      expect(body.code).toBe("FORBIDDEN_ROLE")
      expect(body.error).toContain("CADETE")
      expect(body.hint).toBeDefined()
    })

    it("allows an admin to update and delete a route", async () => {
      const updateResponse = await app.inject({
        method: "PUT",
        url: "/api/routes/1",
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { route_name: "Updated Route" },
      })
      const deleteResponse = await app.inject({
        method: "DELETE",
        url: "/api/routes/1",
        headers: { authorization: `Bearer ${adminToken}` },
      })

      expect(updateResponse.statusCode).toBe(200)
      expect(JSON.parse(updateResponse.body).routeName).toBe("Updated Route")
      expect(deleteResponse.statusCode).toBe(204)
    })

    it("prevents a driver from updating another driver's location", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/drivers/2/location",
        headers: { authorization: `Bearer ${driverToken}` },
        payload: { lat: -8.8, long: 13.2 },
      })

      expect(response.statusCode).toBe(403)
    })
  })

  describe("GET authenticated lists", () => {
    it("GET /api/cadetes without token returns 401 with a specific message", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/cadetes",
      })
      expect(response.statusCode).toBe(401)
      const body = JSON.parse(response.body)
      expect(body.code).toBe("UNAUTHORIZED")
      expect(body.error).toContain("Token")
    })

    it("GET /api/admins as cadete returns 403", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/admins",
        headers: { authorization: `Bearer ${cadeteToken}` },
      })
      expect(response.statusCode).toBe(403)
      expect(JSON.parse(response.body).code).toBe("FORBIDDEN_ROLE")
    })

    it("GET /api/admins should return 200 with data list", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/admins",
        headers: { authorization: `Bearer ${adminToken}` },
      })
      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body).toHaveProperty("data")
      expect(body).toHaveProperty("total")
    })

    it("GET /api/cadetes should return 200 with data list", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/cadetes",
        headers: { authorization: `Bearer ${cadeteToken}` },
      })
      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body).toHaveProperty("data")
      expect(body).toHaveProperty("total")
    })

    it("GET /api/drivers should return 200 with data list", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/drivers",
        headers: { authorization: `Bearer ${driverToken}` },
      })
      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body).toHaveProperty("data")
      expect(body).toHaveProperty("total")
    })

    it("GET /api/routes should return 200 with data list", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/routes",
        headers: { authorization: `Bearer ${cadeteToken}` },
      })
      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body).toHaveProperty("data")
      expect(body).toHaveProperty("total")
    })

    it("GET /api/minibusstops should return 200 with data list", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/minibusstops",
        headers: { authorization: `Bearer ${cadeteToken}` },
      })
      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body).toHaveProperty("data")
      expect(body).toHaveProperty("total")
    })

    it("GET /api/chats should return 200 with data list", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/chats",
        headers: { authorization: `Bearer ${cadeteToken}` },
      })
      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body).toHaveProperty("data")
      expect(body).toHaveProperty("total")
    })
  })

  describe("POST /api/auth/42/driver/login invalid credentials", () => {
    it("should return 401 with generic message", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/auth/42/driver/login",
        payload: { username: "nonexistent", password: "wrongpassword" },
      })

      expect(response.statusCode).toBe(401)
      const body = JSON.parse(response.body)
      expect(body.error).toBe("Credenciais inválidas.")
      expect(body.code).toBe("INVALID_CREDENTIALS")
    })
  })

  describe("POST /api/auth/42/admin/login invalid credentials", () => {
    it("should return 401 with generic message", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/auth/42/admin/login",
        payload: { username: "nonexistent", password: "wrongpassword" },
      })

      expect(response.statusCode).toBe(401)
      const body = JSON.parse(response.body)
      expect(body.error).toBe("Credenciais inválidas.")
      expect(body.code).toBe("INVALID_CREDENTIALS")
    })
  })
})
