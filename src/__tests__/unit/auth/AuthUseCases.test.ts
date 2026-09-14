import { GenerateAuthUrlUseCase } from "../../../application/auth/useCases/GenerateAuthUrl"
import { Handle42CallbackUseCase, mapIntraTokenExchangeError } from "../../../application/auth/useCases/Handle42Callback"
import { ApplicationError } from "../../../application/errors/ApplicationError"

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
      await expect(useCase.execute("")).rejects.toThrow("O parâmetro code do Intra 42 é obrigatório.")
    })
  })

  describe("mapIntraTokenExchangeError", () => {
    it("maps invalid_client to a clear 502 ApplicationError", () => {
      const mapped = mapIntraTokenExchangeError({
        data: {
          payload: {
            error: "invalid_client",
            error_description: "Client authentication failed",
          },
        },
      })
      expect(mapped).toBeInstanceOf(ApplicationError)
      expect(mapped.statusCode).toBe(502)
      expect(mapped.message).toMatch(/FORTYTWO_CLIENT/)
    })

    it("maps invalid_grant to 401", () => {
      const mapped = mapIntraTokenExchangeError({
        data: { payload: { error: "invalid_grant", error_description: "expired" } },
      })
      expect(mapped.statusCode).toBe(401)
      expect(mapped.message).toMatch(/já usado|inválido/i)
    })
  })
})
