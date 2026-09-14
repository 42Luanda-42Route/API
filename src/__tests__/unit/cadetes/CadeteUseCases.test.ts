import { CreateCadeteUseCase } from "../../../application/cadetes/useCases/CreateCadete"
import { GetCadeteByIdUseCase } from "../../../application/cadetes/useCases/GetCadeteById"
import { ListCadetesUseCase } from "../../../application/cadetes/useCases/ListCadetes"
import { UpdateCadeteUseCase } from "../../../application/cadetes/useCases/UpdateCadete"
import { DeleteCadeteUseCase } from "../../../application/cadetes/useCases/DeleteCadete"
import { GetCadeteRouteInfoUseCase } from "../../../application/cadetes/useCases/GetCadeteRouteInfo"
import { CadeteRepository } from "../../../domain/cadetes/CadeteRepository"
import { ApplicationError } from "../../../application/errors/ApplicationError"

describe("Cadete Use Cases", () => {
  let repo: jest.Mocked<CadeteRepository>

  beforeEach(() => {
    repo = {
      list: jest.fn(),
      getById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findByUsernameOrEmail: jest.fn(),
      getRouteInfo: jest.fn(),
    }
  })

  describe("CreateCadeteUseCase", () => {
    it("should create cadete successfully", async () => {
      repo.findByUsernameOrEmail.mockResolvedValue(null)
      const cadete = {
        id: 1,
        fullName: "Cadete 1",
        username: "cadete1",
        email: "cadete1@42luanda.com",
        city: "Luanda",
        district: "Ingombota",
        priorityList: false,
        phone: 923456789,
        stopId: null,
        createdAt: new Date(),
      }
      repo.create.mockResolvedValue(cadete)

      const useCase = new CreateCadeteUseCase(repo)
      const result = await useCase.execute({
        full_name: "Cadete 1",
        username: "cadete1",
        email: "cadete1@42luanda.com",
        city: "Luanda",
        district: "Ingombota",
      })

      expect(result.id).toBe(1)
      expect(repo.create).toHaveBeenCalled()
    })

    it("should throw error if email is invalid", async () => {
      const useCase = new CreateCadeteUseCase(repo)
      await expect(
        useCase.execute({
          username: "cadete1",
          email: "invalid-email",
        }),
      ).rejects.toThrow(ApplicationError)
    })

    it("should throw error if username/email already exists", async () => {
      repo.findByUsernameOrEmail.mockResolvedValue({
        id: 1,
        fullName: "Existing",
        username: "cadete1",
        email: "cadete1@42luanda.com",
        city: null,
        district: null,
        priorityList: false,
        phone: null,
        stopId: null,
        createdAt: new Date(),
      })

      const useCase = new CreateCadeteUseCase(repo)
      await expect(
        useCase.execute({
          username: "cadete1",
          email: "cadete1@42luanda.com",
        }),
      ).rejects.toThrow(ApplicationError)
    })
  })

  describe("GetCadeteByIdUseCase", () => {
    it("should return cadete if exists", async () => {
      const cadete = {
        id: 1,
        fullName: "Cadete 1",
        username: "cadete1",
        email: "cadete1@42luanda.com",
        city: null,
        district: null,
        priorityList: false,
        phone: null,
        stopId: null,
        createdAt: new Date(),
      }
      repo.getById.mockResolvedValue(cadete)

      const useCase = new GetCadeteByIdUseCase(repo)
      const result = await useCase.execute(1)
      expect(result.id).toBe(1)
    })

    it("should throw 404 if cadete not found", async () => {
      repo.getById.mockResolvedValue(null)
      const useCase = new GetCadeteByIdUseCase(repo)
      await expect(useCase.execute(99)).rejects.toThrow(ApplicationError)
    })
  })

  describe("ListCadetesUseCase", () => {
    it("should return paginated list of cadetes", async () => {
      repo.list.mockResolvedValue({ data: [], total: 0 })
      const useCase = new ListCadetesUseCase(repo)
      const result = await useCase.execute(1, 20)

      expect(result.total).toBe(0)
      expect(result.page).toBe(1)
      expect(result.limit).toBe(20)
    })
  })

  describe("UpdateCadeteUseCase", () => {
    it("should update existing cadete", async () => {
      const existing = {
        id: 1,
        fullName: "Old",
        username: "cadete1",
        email: "c@c.com",
        city: null,
        district: null,
        priorityList: false,
        phone: null,
        stopId: null,
        createdAt: new Date(),
      }
      repo.getById.mockResolvedValue(existing)
      repo.update.mockResolvedValue({ ...existing, fullName: "New" })

      const useCase = new UpdateCadeteUseCase(repo)
      const result = await useCase.execute(1, { full_name: "New" })
      expect(result.fullName).toBe("New")
    })

    it("should throw 404 if updating non-existent cadete", async () => {
      repo.getById.mockResolvedValue(null)
      const useCase = new UpdateCadeteUseCase(repo)
      await expect(useCase.execute(99, { full_name: "New" })).rejects.toThrow(ApplicationError)
    })

    it("lets a cadete update their own contact fields", async () => {
      const existing = {
        id: 1,
        fullName: "Old",
        username: "cadete1",
        email: "c@c.com",
        city: null,
        district: null,
        priorityList: false,
        phone: null,
        stopId: null,
        createdAt: new Date(),
      }
      repo.getById.mockResolvedValue(existing)
      repo.update.mockResolvedValue({ ...existing, city: "Luanda", stopId: 3 })

      const useCase = new UpdateCadeteUseCase(repo)
      await expect(
        useCase.execute(1, { city: "Luanda", stop_id: 3 }, { id: 1, role: "CADETE" }),
      ).resolves.toMatchObject({ city: "Luanda" })
    })

    it("blocks a cadete from changing username, email or priorityList", async () => {
      repo.getById.mockResolvedValue({
        id: 1,
        fullName: "Old",
        username: "cadete1",
        email: "c@c.com",
        city: null,
        district: null,
        priorityList: false,
        phone: null,
        stopId: null,
        createdAt: new Date(),
      })

      const useCase = new UpdateCadeteUseCase(repo)
      await expect(
        useCase.execute(1, { email: "novo@42.ao" }, { id: 1, role: "CADETE" }),
      ).rejects.toMatchObject({ statusCode: 403, code: "CADETE_CANNOT_EDIT_FIELD" })
      expect(repo.update).not.toHaveBeenCalled()
    })
  })

  describe("DeleteCadeteUseCase", () => {
    it("should delete existing cadete", async () => {
      repo.getById.mockResolvedValue({
        id: 1,
        fullName: "Cadete",
        username: "c",
        email: "c@c.com",
        city: null,
        district: null,
        priorityList: false,
        phone: null,
        stopId: null,
        createdAt: new Date(),
      })
      repo.delete.mockResolvedValue(undefined)

      const useCase = new DeleteCadeteUseCase(repo)
      await useCase.execute(1)
      expect(repo.delete).toHaveBeenCalledWith(1)
    })

    it("should throw 404 when deleting non-existent cadete", async () => {
      repo.getById.mockResolvedValue(null)
      const useCase = new DeleteCadeteUseCase(repo)
      await expect(useCase.execute(99)).rejects.toThrow(ApplicationError)
    })
  })

  describe("GetCadeteRouteInfoUseCase", () => {
    it("should return route info for cadete", async () => {
      repo.getRouteInfo.mockResolvedValue({
        fullName: "Cadete 1",
        stop: { id: 1, stopName: "Stop 1", route: { id: 3, routeName: "Rota 3", drivers: [] } },
      })
      const useCase = new GetCadeteRouteInfoUseCase(repo)
      const result = await useCase.execute(1)
      expect(result.fullName).toBe("Cadete 1")
      expect(result.stop?.route?.routeName).toBe("Rota 3")
    })

    it("should throw 404 if cadete has no route", async () => {
      repo.getRouteInfo.mockResolvedValue({ fullName: "Cadete 1", stop: null })
      const useCase = new GetCadeteRouteInfoUseCase(repo)
      await expect(useCase.execute(1)).rejects.toMatchObject({
        statusCode: 404,
        code: "CADETE_WITHOUT_ROUTE",
      })
    })

    it("should throw 404 if route info not found", async () => {
      repo.getRouteInfo.mockResolvedValue(null)
      const useCase = new GetCadeteRouteInfoUseCase(repo)
      await expect(useCase.execute(99)).rejects.toThrow(ApplicationError)
    })
  })
})
