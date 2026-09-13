import { CreateRouteUseCase } from "../../../application/routes/useCases/CreateRoute"
import { AddStopsToRouteUseCase } from "../../../application/routes/useCases/AddStopsToRoute"
import { ListRoutesUseCase } from "../../../application/routes/useCases/ListRoutes"
import { GetRouteByIdUseCase } from "../../../application/routes/useCases/GetRouteById"
import { UpdateRouteUseCase } from "../../../application/routes/useCases/UpdateRoute"
import { DeleteRouteUseCase } from "../../../application/routes/useCases/DeleteRoute"
import { RouteRepository } from "../../../domain/routes/RouteRepository"
import { ApplicationError } from "../../../application/errors/ApplicationError"

describe("Route Use Cases", () => {
  let repo: jest.Mocked<RouteRepository>

  beforeEach(() => {
    repo = {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      addStops: jest.fn(),
      list: jest.fn(),
      getById: jest.fn(),
    }
  })

  describe("CreateRouteUseCase", () => {
    it("should create route", async () => {
      repo.create.mockResolvedValue({
        id: 1,
        routeName: "Route 1",
        description: "Desc",
        createdAt: new Date(),
      })

      const useCase = new CreateRouteUseCase(repo)
      const result = await useCase.execute({ routeName: "Route 1", description: "Desc" })
      expect(result.id).toBe(1)
    })

    it("should throw if route name is missing", async () => {
      const useCase = new CreateRouteUseCase(repo)
      await expect(useCase.execute({ routeName: "" })).rejects.toThrow(ApplicationError)
    })
  })

  describe("GetRouteByIdUseCase", () => {
    it("should return route with relations", async () => {
      repo.getById.mockResolvedValue({
        id: 1,
        routeName: "Route 1",
        description: null,
        createdAt: new Date(),
        stops: [],
        drivers: [],
      })

      const useCase = new GetRouteByIdUseCase(repo)
      const result = await useCase.execute(1)
      expect(result.id).toBe(1)
    })

    it("should throw 404 if route not found", async () => {
      repo.getById.mockResolvedValue(null)
      const useCase = new GetRouteByIdUseCase(repo)
      await expect(useCase.execute(99)).rejects.toThrow(ApplicationError)
    })
  })

  describe("ListRoutesUseCase", () => {
    it("should list routes with pagination", async () => {
      repo.list.mockResolvedValue({ data: [], total: 0 })
      const useCase = new ListRoutesUseCase(repo)
      const result = await useCase.execute(1, 10)
      expect(result.total).toBe(0)
      expect(result.page).toBe(1)
    })
  })

  describe("AddStopsToRouteUseCase", () => {
    it("should add stops to route", async () => {
      repo.getById.mockResolvedValue({
        id: 1,
        routeName: "Route 1",
        description: null,
        createdAt: new Date(),
        stops: [],
        drivers: [],
      })
      repo.addStops.mockResolvedValue({
        id: 1,
        routeName: "Route 1",
        description: null,
        createdAt: new Date(),
        stops: [{ id: 10, stopName: "Stop 10", district: null, latitude: null, longitude: null, description: null, routeId: 1 }],
        drivers: [],
      })

      const useCase = new AddStopsToRouteUseCase(repo)
      const result = await useCase.execute({ routeId: 1, stopIds: [10] })
      expect(result.stops.length).toBe(1)
    })

    it("should throw 404 if route not found", async () => {
      repo.getById.mockResolvedValue(null)
      const useCase = new AddStopsToRouteUseCase(repo)
      await expect(useCase.execute({ routeId: 99, stopIds: [10] })).rejects.toThrow(ApplicationError)
    })
  })

  describe("UpdateRouteUseCase", () => {
    it("should update and normalize route data", async () => {
      repo.getById.mockResolvedValue({
        id: 1,
        routeName: "Old route",
        description: null,
        createdAt: new Date(),
        stops: [],
        drivers: [],
      })
      repo.update.mockResolvedValue({
        id: 1,
        routeName: "Updated route",
        description: null,
        createdAt: new Date(),
      })

      const result = await new UpdateRouteUseCase(repo).execute(1, { routeName: "  Updated route  " })

      expect(repo.update).toHaveBeenCalledWith(1, { routeName: "Updated route", description: undefined })
      expect(result.routeName).toBe("Updated route")
    })

    it("should reject an empty route name", async () => {
      await expect(new UpdateRouteUseCase(repo).execute(1, { routeName: " " })).rejects.toMatchObject({
        statusCode: 422,
      })
    })

    it("should return 404 when updating a missing route", async () => {
      repo.getById.mockResolvedValue(null)

      await expect(new UpdateRouteUseCase(repo).execute(99, { description: "Missing" })).rejects.toMatchObject({
        statusCode: 404,
      })
      expect(repo.update).not.toHaveBeenCalled()
    })
  })

  describe("DeleteRouteUseCase", () => {
    it("should delete an existing route", async () => {
      repo.getById.mockResolvedValue({
        id: 1,
        routeName: "Route 1",
        description: null,
        createdAt: new Date(),
        stops: [],
        drivers: [],
      })

      await new DeleteRouteUseCase(repo).execute(1)

      expect(repo.delete).toHaveBeenCalledWith(1)
    })

    it("should return 404 when deleting a missing route", async () => {
      repo.getById.mockResolvedValue(null)

      await expect(new DeleteRouteUseCase(repo).execute(99)).rejects.toMatchObject({ statusCode: 404 })
      expect(repo.delete).not.toHaveBeenCalled()
    })
  })
})
