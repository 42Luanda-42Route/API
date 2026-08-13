import { GenerateAuthUrlUseCase } from "../../../application/auth/useCases/GenerateAuthUrl"

describe("Auth Use Cases", () => {
  describe("GenerateAuthUrlUseCase", () => {
    it("should generate a 42 OAuth authorization URL", async () => {
      const useCase = new GenerateAuthUrlUseCase()
      const url = await useCase.execute("http://localhost:3000/callback")
      expect(url).toContain("https://api.intra.42.fr/oauth/authorize")
      expect(url).toContain("client_id")
    })
  })
})
