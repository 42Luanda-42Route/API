import { AdminPrismaRepository } from "../../infrastructure/repositories/AdminPrismaRepository"
import { DriverPrismaRepository } from "../../infrastructure/repositories/DriverPrismaRepository"
import { CadetePrismaRepository } from "../../infrastructure/repositories/CadetePrismaRepository"
import { MiniBusStopPrismaRepository } from "../../infrastructure/repositories/MiniBusStopPrismaRepository"
import { RoutePrismaRepository } from "../../infrastructure/repositories/RoutePrismaRepository"

describe("Prisma Repositories Integration / Mapping Tests", () => {
  let mockPrisma: any

  beforeEach(() => {
    mockPrisma = {
      admins: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findFirst: jest.fn(),
      },
      drivers: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findFirst: jest.fn(),
      },
      driverCoordinates: {
        upsert: jest.fn(),
      },
      cadetes: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findFirst: jest.fn(),
      },
      miniBusStop: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
      },
      route: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    }
  })

  describe("AdminPrismaRepository", () => {
    it("should list and map admins correctly", async () => {
      mockPrisma.admins.findMany.mockResolvedValue([
        { id: 1, full_name: "Admin", username: "admin", email: "a@a.com", password: "p", createdAt: new Date() },
      ])
      mockPrisma.admins.count.mockResolvedValue(1)

      const repo = new AdminPrismaRepository(mockPrisma)
      const res = await repo.list(1, 10)

      expect(res.total).toBe(1)
      expect(res.data[0].fullName).toBe("Admin")
    })
  })

  describe("DriverPrismaRepository", () => {
    it("should list and map drivers correctly", async () => {
      mockPrisma.drivers.findMany.mockResolvedValue([
        { id: 1, full_name: "Driver", username: "driver", email: "d@d.com", password: "p", photo: null, phone: 923, current_route_id: 1, createdAt: new Date() },
      ])
      mockPrisma.drivers.count.mockResolvedValue(1)

      const repo = new DriverPrismaRepository(mockPrisma)
      const res = await repo.list(1, 10)

      expect(res.total).toBe(1)
      expect(res.data[0].currentRouteId).toBe(1)
    })
  })

  describe("CadetePrismaRepository", () => {
    it("should list and map cadetes correctly", async () => {
      mockPrisma.cadetes.findMany.mockResolvedValue([
        { id: 1, full_name: "Cadete", username: "cadete", email: "c@c.com", city: "Luanda", district: "Ingombota", priorityList: true, phone: null, stop_id: 2, createdAt: new Date() },
      ])
      mockPrisma.cadetes.count.mockResolvedValue(1)

      const repo = new CadetePrismaRepository(mockPrisma)
      const res = await repo.list(1, 10)

      expect(res.total).toBe(1)
      expect(res.data[0].priorityList).toBe(true)
      expect(res.data[0].stopId).toBe(2)
    })
  })

  describe("MiniBusStopPrismaRepository", () => {
    it("should list and map mini bus stops correctly", async () => {
      mockPrisma.miniBusStop.findMany.mockResolvedValue([
        { id: 1, stop_name: "Stop 1", district: "D1", latitude: -8.8, longitude: 13.2, description: null, route_id: 1, createdAt: new Date() },
      ])
      mockPrisma.miniBusStop.count.mockResolvedValue(1)

      const repo = new MiniBusStopPrismaRepository(mockPrisma)
      const res = await repo.list(1, 10)

      expect(res.total).toBe(1)
      expect(res.data[0].stopName).toBe("Stop 1")
    })
  })

  describe("RoutePrismaRepository", () => {
    it("should list and map routes with relations", async () => {
      mockPrisma.route.findMany.mockResolvedValue([
        {
          id: 1,
          route_name: "Route 1",
          description: null,
          createdAt: new Date(),
          stops: [{ id: 1, stop_name: "S1", district: null, latitude: null, longitude: null, description: null, route_id: 1 }],
          drivers: [{ id: 1, full_name: "D1", username: "d1", email: "d@d.com", phone: 123, photo: null, current_route_id: 1 }],
        },
      ])
      mockPrisma.route.count.mockResolvedValue(1)

      const repo = new RoutePrismaRepository(mockPrisma)
      const res = await repo.list(1, 10)

      expect(res.total).toBe(1)
      expect(res.data[0].stops.length).toBe(1)
      expect(res.data[0].drivers.length).toBe(1)
    })
  })
})
