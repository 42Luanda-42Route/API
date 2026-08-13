import { CreateDriverUseCase } from "../../../application/drivers/useCases/CreateDriver"
import { GetDriverByIdUseCase } from "../../../application/drivers/useCases/GetDriverById"
import { ListDriversUseCase } from "../../../application/drivers/useCases/ListDrivers"
import { UpdateDriverUseCase } from "../../../application/drivers/useCases/UpdateDriver"
import { DeleteDriverUseCase } from "../../../application/drivers/useCases/DeleteDriver"
import { LoginDriverUseCase } from "../../../application/drivers/useCases/LoginDriver"
import { UpdateDriverLocationUseCase } from "../../../application/drivers/useCases/UpdateDriverLocation"
import { AssignRouteUseCase } from "../../../application/drivers/useCases/AssignRoute"
import { LeaveRouteUseCase } from "../../../application/drivers/useCases/LeaveRoute"
import { DriverRepository } from "../../../domain/drivers/DriverRepository"
import { RouteRepository } from "../../../domain/routes/RouteRepository"
import { ApplicationError } from "../../../application/errors/ApplicationError"
import bcrypt from "bcryptjs"

describe("Driver Use Cases", () => {
  let driverRepo: jest.Mocked<DriverRepository>
  let routeRepo: jest.Mocked<RouteRepository>

  beforeEach(() => {
    driverRepo = {
      list: jest.fn(),
      getById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findByUsernameOrEmail: jest.fn(),
      updateLocation: jest.fn(),
      assignRoute: jest.fn(),
      leaveRoute: jest.fn(),
      findDriverIdByRoute: jest.fn(),
    }
    routeRepo = {
      create: jest.fn(),
      addStops: jest.fn(),
      list: jest.fn(),
      getById: jest.fn(),
    }
  })

  describe("CreateDriverUseCase", () => {
    it("should create driver with valid data", async () => {
      driverRepo.findByUsernameOrEmail.mockResolvedValue(null)
      driverRepo.create.mockResolvedValue({
        id: 1,
        fullName: "Driver 1",
        username: "driver1",
        email: "d@d.com",
        password: "hash",
        photo: null,
        phone: 923456789,
        currentRouteId: null,
        createdAt: new Date(),
      })

      const useCase = new CreateDriverUseCase(driverRepo)
      const result = await useCase.execute({
        full_name: "Driver 1",
        username: "driver1",
        email: "d@d.com",
        password: "password123",
      })

      expect(result.id).toBe(1)
    })

    it("should throw if password < 8 chars", async () => {
      const useCase = new CreateDriverUseCase(driverRepo)
      await expect(useCase.execute({ username: "driver1", password: "123" })).rejects.toThrow(ApplicationError)
    })

    it("should throw if driver exists", async () => {
      driverRepo.findByUsernameOrEmail.mockResolvedValue({
        id: 1,
        fullName: "D",
        username: "driver1",
        email: "d@d.com",
        password: "hash",
        photo: null,
        phone: null,
        currentRouteId: null,
        createdAt: new Date(),
      })

      const useCase = new CreateDriverUseCase(driverRepo)
      await expect(useCase.execute({ username: "driver1", password: "password123" })).rejects.toThrow(ApplicationError)
    })
  })

  describe("UpdateDriverLocationUseCase", () => {
    it("should update location with valid coordinates", async () => {
      driverRepo.updateLocation.mockResolvedValue({
        id: 1,
        lat: -8.8383,
        long: 13.2344,
        driverId: 1,
        createdAt: new Date(),
      })

      const useCase = new UpdateDriverLocationUseCase(driverRepo)
      const result = await useCase.execute({ driverId: 1, lat: -8.8383, long: 13.2344 })
      expect(result.lat).toBe(-8.8383)
    })

    it("should throw error for invalid latitude", async () => {
      const useCase = new UpdateDriverLocationUseCase(driverRepo)
      await expect(useCase.execute({ driverId: 1, lat: 95, long: 13 })).rejects.toThrow(ApplicationError)
    })

    it("should throw error for invalid longitude", async () => {
      const useCase = new UpdateDriverLocationUseCase(driverRepo)
      await expect(useCase.execute({ driverId: 1, lat: 10, long: 200 })).rejects.toThrow(ApplicationError)
    })
  })

  describe("AssignRouteUseCase", () => {
    it("should assign route if driver and route exist", async () => {
      driverRepo.getById.mockResolvedValue({
        id: 1,
        fullName: "Driver",
        username: "d",
        email: "d@d.com",
        password: "h",
        photo: null,
        phone: null,
        currentRouteId: null,
        createdAt: new Date(),
      })
      routeRepo.getById.mockResolvedValue({
        id: 2,
        routeName: "Route 2",
        description: null,
        createdAt: new Date(),
        stops: [],
        drivers: [],
      })
      driverRepo.assignRoute.mockResolvedValue({
        id: 1,
        fullName: "Driver",
        username: "d",
        email: "d@d.com",
        password: "h",
        photo: null,
        phone: null,
        currentRouteId: 2,
        createdAt: new Date(),
      })

      const useCase = new AssignRouteUseCase(driverRepo, routeRepo)
      const result = await useCase.execute({ driverId: 1, current_route_id: 2 })
      expect(result.currentRouteId).toBe(2)
    })

    it("should throw 404 if driver not found", async () => {
      driverRepo.getById.mockResolvedValue(null)
      const useCase = new AssignRouteUseCase(driverRepo, routeRepo)
      await expect(useCase.execute({ driverId: 99, current_route_id: 2 })).rejects.toThrow(ApplicationError)
    })

    it("should throw 404 if route not found", async () => {
      driverRepo.getById.mockResolvedValue({
        id: 1,
        fullName: "D",
        username: "d",
        email: "d@d.com",
        password: "h",
        photo: null,
        phone: null,
        currentRouteId: null,
        createdAt: new Date(),
      })
      routeRepo.getById.mockResolvedValue(null)
      const useCase = new AssignRouteUseCase(driverRepo, routeRepo)
      await expect(useCase.execute({ driverId: 1, current_route_id: 99 })).rejects.toThrow(ApplicationError)
    })
  })

  describe("LeaveRouteUseCase", () => {
    it("should clear current route from driver", async () => {
      driverRepo.getById.mockResolvedValue({
        id: 1,
        fullName: "Driver",
        username: "d",
        email: "d@d.com",
        password: "h",
        photo: null,
        phone: null,
        currentRouteId: 2,
        createdAt: new Date(),
      })
      driverRepo.leaveRoute.mockResolvedValue({
        id: 1,
        fullName: "Driver",
        username: "d",
        email: "d@d.com",
        password: "h",
        photo: null,
        phone: null,
        currentRouteId: null,
        createdAt: new Date(),
      })

      const useCase = new LeaveRouteUseCase(driverRepo)
      const result = await useCase.execute(1)
      expect(result.currentRouteId).toBeNull()
    })
  })

  describe("LoginDriverUseCase", () => {
    it("should return token on correct credentials", async () => {
      const hash = await bcrypt.hash("password123", 10)
      driverRepo.findByUsernameOrEmail.mockResolvedValue({
        id: 1,
        fullName: "Driver",
        username: "driver1",
        email: "d@d.com",
        password: hash,
        photo: null,
        phone: null,
        currentRouteId: null,
        createdAt: new Date(),
      })

      const useCase = new LoginDriverUseCase(driverRepo)
      const result = await useCase.execute({ username: "driver1", password: "password123" })
      expect(result).toHaveProperty("token")
    })
  })
})
