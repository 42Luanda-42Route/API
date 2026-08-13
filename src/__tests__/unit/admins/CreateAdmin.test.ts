import { CreateAdminUseCase } from "../../../application/admins/useCases/CreateAdmin"
import { AdminRepository } from "../../../domain/admins/AdminRepository"
import { ApplicationError } from "../../../application/errors/ApplicationError"

describe("CreateAdminUseCase", () => {
  let repo: jest.Mocked<AdminRepository>
  let useCase: CreateAdminUseCase

  beforeEach(() => {
    repo = {
      list: jest.fn(),
      getById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findByUsernameOrEmail: jest.fn(),
    }
    useCase = new CreateAdminUseCase(repo)
  })

  it("should create admin when valid data is provided", async () => {
    repo.findByUsernameOrEmail.mockResolvedValue(null)
    repo.create.mockResolvedValue({
      id: 1,
      fullName: "Admin User",
      username: "adminuser",
      email: "admin@test.com",
      password: "hashedpassword",
      createdAt: new Date(),
    })

    const result = await useCase.execute({
      full_name: "Admin User",
      username: "adminuser",
      email: "admin@test.com",
      password: "password123",
    })

    expect(result.id).toBe(1)
    expect(repo.create).toHaveBeenCalledTimes(1)
  })

  it("should throw error if password is less than 8 characters", async () => {
    await expect(
      useCase.execute({
        username: "adminuser",
        password: "123",
      }),
    ).rejects.toThrow(ApplicationError)
  })

  it("should throw error if email is invalid", async () => {
    await expect(
      useCase.execute({
        username: "adminuser",
        email: "invalid-email",
        password: "password123",
      }),
    ).rejects.toThrow(ApplicationError)
  })

  it("should throw error if username/email already exists", async () => {
    repo.findByUsernameOrEmail.mockResolvedValue({
      id: 1,
      fullName: "Existing",
      username: "adminuser",
      email: "admin@test.com",
      password: "hash",
      createdAt: new Date(),
    })

    await expect(
      useCase.execute({
        username: "adminuser",
        email: "admin@test.com",
        password: "password123",
      }),
    ).rejects.toThrow(ApplicationError)
  })
})
