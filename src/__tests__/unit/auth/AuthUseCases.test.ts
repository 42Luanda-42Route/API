import { GenerateAuthUrlUseCase } from "../../../application/auth/useCases/GenerateAuthUrl"
import { Handle42CallbackUseCase } from "../../../application/auth/useCases/Handle42Callback"

describe("Auth Use Cases", () => {
  describe("GenerateAuthUrlUseCase", () => {
    it("should generate a 42 OAuth authorization URL", async () => {
      const useCase = new GenerateAuthUrlUseCase()
      const url = await useCase.execute("http://localhost:3000/callback")
      expect(url).toContain("https://api.intra.42.fr/oauth/authorize")
      expect(url).toContain("client_id")
    })
  })

  describe("Handle42CallbackUseCase", () => {
    it("should throw error if code is empty", async () => {
      const mockRepo = {
        list: jest.fn(),
        getById: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findByUsernameOrEmail: jest.fn(),
        getRouteInfo: jest.fn(),
      }
      const useCase = new Handle42CallbackUseCase(mockRepo)
      await expect(useCase.execute("")).rejects.toThrow("code is required")
    })
  })
})
