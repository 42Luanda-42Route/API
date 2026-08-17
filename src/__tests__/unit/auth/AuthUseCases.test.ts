import { GenerateAuthUrlUseCase } from "../../../application/auth/useCases/GenerateAuthUrl"

jest.mock("simple-oauth2", () => ({
  AuthorizationCode: jest.fn().mockImplementation(() => ({
    getToken: jest.fn().mockResolvedValue({ token: { access_token: "fake-intra-token" } }),
    authorizeURL: jest.fn().mockImplementation((params: any) => {
      const query = new URLSearchParams({
        client_id: "fake-client-id",
        redirect_uri: params.redirect_uri,
        scope: params.scope,
        state: params.state,
      })
      return `https://api.intra.42.fr/oauth/authorize?${query.toString()}`
    }),
  })),
}))

import { Handle42CallbackUseCase } from "../../../application/auth/useCases/Handle42Callback"

function makeMockRepo(overrides: Partial<Record<string, jest.Mock>> = {}) {
  return {
    list: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findByUsernameOrEmail: jest.fn(),
    getRouteInfo: jest.fn(),
    ...overrides,
  }
}

const intraProfile = {
  id: 999,
  login: "csilva",
  email: "csilva@student.42luanda.com",
  usual_full_name: "Cadete Silva",
  cursus_users: [],
}

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
    const originalFetch = global.fetch

    beforeEach(() => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(intraProfile),
      }) as any
    })

    afterEach(() => {
      global.fetch = originalFetch
    })

    it("should throw error if code is empty", async () => {
      const mockRepo = makeMockRepo()
      const useCase = new Handle42CallbackUseCase(mockRepo)
      await expect(useCase.execute("")).rejects.toThrow("code is required")
    })

    it("should auto-register a new cadete on first login", async () => {
      const createdCadete = {
        id: 1,
        fullName: "Cadete Silva",
        username: "csilva",
        email: "csilva@student.42luanda.com",
        city: null,
        district: null,
        priorityList: false,
        phone: null,
        stopId: null,
        createdAt: new Date(),
      }
      const mockRepo = makeMockRepo({
        findByUsernameOrEmail: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(createdCadete),
      })

      const useCase = new Handle42CallbackUseCase(mockRepo)
      const result = await useCase.execute("valid-code")

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          fullName: "Cadete Silva",
          username: "csilva",
          email: "csilva@student.42luanda.com",
        }),
      )
      expect(result.cadete).toEqual(
        expect.objectContaining({ id: 1, username: "csilva", email: "csilva@student.42luanda.com" }),
      )
      expect(result.isDBUser).toBe(false)
      expect(result.needsOnboarding).toBe(true)
    })

    it("should not re-create an existing cadete", async () => {
      const existingCadete = {
        id: 5,
        fullName: "Cadete Silva",
        username: "csilva",
        email: "csilva@student.42luanda.com",
        city: null,
        district: "Talatona",
        priorityList: false,
        phone: null,
        stopId: 2,
        createdAt: new Date(),
      }
      const mockRepo = makeMockRepo({
        findByUsernameOrEmail: jest.fn().mockResolvedValue(existingCadete),
      })

      const useCase = new Handle42CallbackUseCase(mockRepo)
      const result = await useCase.execute("valid-code")

      expect(mockRepo.create).not.toHaveBeenCalled()
      expect(result.isDBUser).toBe(true)
      expect(result.needsOnboarding).toBe(false)
      expect(result.hasDistrict).toBe(true)
      expect(result.hasStop).toBe(true)
    })
  })
})
