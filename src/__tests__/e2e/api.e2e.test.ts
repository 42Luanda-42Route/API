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
      jest.spyOn(app.prisma.cadetes, "count").mockResolvedValue(0)
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
      expect(JSON.parse(response.body).error).toBe("Forbidden")
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

  describe("GET Public Routes", () => {
    it("GET /api/admins should return 200 with data list", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/admins",
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
      expect(body.error).toBe("Invalid credentials")
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
      expect(body.error).toBe("Invalid credentials")
    })
  })
})
