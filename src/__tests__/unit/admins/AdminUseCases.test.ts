import { DeleteAdminUseCase } from "../../../application/admins/useCases/DeleteAdmin"
import { GetAdminByIdUseCase } from "../../../application/admins/useCases/GetAdminById"
import { ListAdminsUseCase } from "../../../application/admins/useCases/ListAdmins"
import { UpdateAdminUseCase } from "../../../application/admins/useCases/UpdateAdmin"
import { LoginAdminUseCase } from "../../../application/admins/useCases/LoginAdmin"
import { AdminRepository } from "../../../domain/admins/AdminRepository"
import { ApplicationError } from "../../../application/errors/ApplicationError"
import bcrypt from "bcryptjs"

describe("Admin Use Cases", () => {
  let repo: jest.Mocked<AdminRepository>

  beforeEach(() => {
    repo = {
      list: jest.fn(),
      getById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findByUsernameOrEmail: jest.fn(),
    }
  })

  describe("GetAdminByIdUseCase", () => {
    it("should return admin if exists", async () => {
      const admin = { id: 1, fullName: "A", username: "a", email: "a@a.com", password: "p", createdAt: new Date() }
      repo.getById.mockResolvedValue(admin)

      const useCase = new GetAdminByIdUseCase(repo)
      const result = await useCase.execute(1)
      const { password, ...expected } = admin
      expect(result).toEqual(expected)
    })

    it("should throw 404 if admin not found", async () => {
      repo.getById.mockResolvedValue(null)
      const useCase = new GetAdminByIdUseCase(repo)
      await expect(useCase.execute(99)).rejects.toThrow(ApplicationError)
    })
  })

  describe("ListAdminsUseCase", () => {
    it("should return paginated admins without password", async () => {
      const admin = { id: 1, fullName: "A", username: "a", email: "a@a.com", password: "p", createdAt: new Date() }
      repo.list.mockResolvedValue({ data: [admin], total: 1 })

      const useCase = new ListAdminsUseCase(repo)
      const result = await useCase.execute(1, 10)

      expect(result.total).toBe(1)
      expect(result.data[0]).not.toHaveProperty("password")
      expect(result.page).toBe(1)
      expect(result.limit).toBe(10)
    })
  })

  describe("UpdateAdminUseCase", () => {
    it("should update admin fields", async () => {
      const existing = { id: 1, fullName: "Old", username: "old", email: "old@a.com", password: "hash", createdAt: new Date() }
      repo.getById.mockResolvedValue(existing)
      repo.update.mockResolvedValue({ ...existing, fullName: "New" })

      const useCase = new UpdateAdminUseCase(repo)
      const result = await useCase.execute(1, { full_name: "New" })

      expect(result.fullName).toBe("New")
      expect(repo.update).toHaveBeenCalled()
    })

    it("should throw 404 if updating non-existent admin", async () => {
      repo.getById.mockResolvedValue(null)
      const useCase = new UpdateAdminUseCase(repo)
      await expect(useCase.execute(99, { full_name: "New" })).rejects.toThrow(ApplicationError)
    })
  })

  describe("DeleteAdminUseCase", () => {
    it("should delete existing admin", async () => {
      const existing = { id: 1, fullName: "A", username: "a", email: "a@a.com", password: "p", createdAt: new Date() }
      repo.getById.mockResolvedValue(existing)
      repo.delete.mockResolvedValue(undefined)

      const useCase = new DeleteAdminUseCase(repo)
      await useCase.execute(1)
      expect(repo.delete).toHaveBeenCalledWith(1)
    })

    it("should throw 404 if deleting non-existent admin", async () => {
      repo.getById.mockResolvedValue(null)
      const useCase = new DeleteAdminUseCase(repo)
      await expect(useCase.execute(99)).rejects.toThrow(ApplicationError)
    })
  })

  describe("LoginAdminUseCase", () => {
    it("should return token for valid credentials", async () => {
      const hash = await bcrypt.hash("password123", 10)
      repo.findByUsernameOrEmail.mockResolvedValue({
        id: 1,
        fullName: "Admin",
        username: "adminuser",
        email: "admin@test.com",
        password: hash,
        createdAt: new Date(),
      })

      const useCase = new LoginAdminUseCase(repo)
      const result = await useCase.execute({ username: "adminuser", password: "password123" })

      expect(result).toHaveProperty("token")
      expect(typeof result.token).toBe("string")
    })

    it("should throw 401 for unknown user", async () => {
      repo.findByUsernameOrEmail.mockResolvedValue(null)
      const useCase = new LoginAdminUseCase(repo)
      await expect(useCase.execute({ username: "wrong", password: "password123" })).rejects.toThrow(ApplicationError)
    })

    it("should throw 401 for wrong password", async () => {
      const hash = await bcrypt.hash("password123", 10)
      repo.findByUsernameOrEmail.mockResolvedValue({
        id: 1,
        fullName: "Admin",
        username: "adminuser",
        email: "admin@test.com",
        password: hash,
        createdAt: new Date(),
      })

      const useCase = new LoginAdminUseCase(repo)
      await expect(useCase.execute({ username: "adminuser", password: "wrongpassword" })).rejects.toThrow(ApplicationError)
    })
  })
})
