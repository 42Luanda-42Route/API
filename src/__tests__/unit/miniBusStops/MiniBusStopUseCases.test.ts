import { CreateStopUseCase } from "../../../application/miniBusStops/useCases/CreateStop"
import { GetStopByIdUseCase } from "../../../application/miniBusStops/useCases/GetStopById"
import { ListStopsUseCase } from "../../../application/miniBusStops/useCases/ListStops"
import { UpdateStopUseCase } from "../../../application/miniBusStops/useCases/UpdateStop"
import { DeleteStopUseCase } from "../../../application/miniBusStops/useCases/DeleteStop"
import { MiniBusStopRepository } from "../../../domain/miniBusStops/MiniBusStopRepository"
import { RouteRepository } from "../../../domain/routes/RouteRepository"
import { ApplicationError } from "../../../application/errors/ApplicationError"

describe("MiniBusStop Use Cases", () => {
  let stopRepo: jest.Mocked<MiniBusStopRepository>
  let routeRepo: jest.Mocked<RouteRepository>

  beforeEach(() => {
    stopRepo = {
      list: jest.fn(),
      getById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    }
    routeRepo = {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      addStops: jest.fn(),
      list: jest.fn(),
      getById: jest.fn(),
    }
  })

  describe("CreateStopUseCase", () => {
    it("should create bus stop", async () => {
      routeRepo.getById.mockResolvedValue({
        id: 1,
        routeName: "Route 1",
        description: null,
        createdAt: new Date(),
        stops: [],
        drivers: [],
      })
      stopRepo.create.mockResolvedValue({
        id: 1,
        stopName: "Stop 1",
        district: "District 1",
        latitude: -8.8,
        longitude: 13.2,
        description: null,
        routeId: 1,
        createdAt: new Date(),
      })

      const useCase = new CreateStopUseCase(stopRepo, routeRepo)
      const result = await useCase.execute({
        stop_name: "Stop 1",
        district: "District 1",
        latitude: -8.8,
        longitude: 13.2,
        route_id: 1,
      })

      expect(result.id).toBe(1)
    })

    it("should throw if route does not exist", async () => {
      routeRepo.getById.mockResolvedValue(null)
      const useCase = new CreateStopUseCase(stopRepo, routeRepo)
      await expect(
        useCase.execute({
          stop_name: "Stop 1",
          route_id: 99,
        }),
      ).rejects.toThrow(ApplicationError)
    })
  })

  describe("GetStopByIdUseCase", () => {
    it("should return stop if found", async () => {
      stopRepo.getById.mockResolvedValue({
        id: 1,
        stopName: "Stop 1",
        district: null,
        latitude: null,
        longitude: null,
        description: null,
        routeId: 1,
        createdAt: new Date(),
      })

      const useCase = new GetStopByIdUseCase(stopRepo)
      const result = await useCase.execute(1)
      expect(result.id).toBe(1)
    })

    it("should throw 404 if stop not found", async () => {
      stopRepo.getById.mockResolvedValue(null)
      const useCase = new GetStopByIdUseCase(stopRepo)
      await expect(useCase.execute(99)).rejects.toThrow(ApplicationError)
    })
  })

  describe("ListStopsUseCase", () => {
    it("should return paginated stops", async () => {
      stopRepo.list.mockResolvedValue({ data: [], total: 0 })
      const useCase = new ListStopsUseCase(stopRepo)
      const result = await useCase.execute(1, 10)
      expect(result.total).toBe(0)
      expect(result.page).toBe(1)
    })
  })

  describe("UpdateStopUseCase", () => {
    it("should update existing stop", async () => {
      const existing = {
        id: 1,
        stopName: "Old",
        district: null,
        latitude: null,
        longitude: null,
        description: null,
        routeId: 1,
        createdAt: new Date(),
      }
      stopRepo.getById.mockResolvedValue(existing)
      stopRepo.update.mockResolvedValue({ ...existing, stopName: "New" })

      const useCase = new UpdateStopUseCase(stopRepo, routeRepo)
      const result = await useCase.execute(1, { stop_name: "New" })
      expect(result.stopName).toBe("New")
    })
  })

  describe("DeleteStopUseCase", () => {
    it("should delete existing stop", async () => {
      stopRepo.getById.mockResolvedValue({
        id: 1,
        stopName: "Stop",
        district: null,
        latitude: null,
        longitude: null,
        description: null,
        routeId: 1,
        createdAt: new Date(),
      })
      stopRepo.delete.mockResolvedValue(undefined)

      const useCase = new DeleteStopUseCase(stopRepo)
      await useCase.execute(1)
      expect(stopRepo.delete).toHaveBeenCalledWith(1)
    })

    it("should throw 404 when deleting non-existent stop", async () => {
      stopRepo.getById.mockResolvedValue(null)
      const useCase = new DeleteStopUseCase(stopRepo)
      await expect(useCase.execute(99)).rejects.toThrow(ApplicationError)
    })
  })
})
