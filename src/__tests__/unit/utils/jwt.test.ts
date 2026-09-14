import { generateToken, issueAuthTokens, verifyRefreshToken, verifyToken } from "../../../utils/jwt"
import { RefreshTokenUseCase } from "../../../application/auth/useCases/RefreshToken"

describe("JWT Utils", () => {
  it("should generate and verify a valid JWT token", () => {
    const payload = { id: 1, username: "testuser", role: "ADMIN" }
    const token = generateToken(payload)

    expect(typeof token).toBe("string")

    const decoded = verifyToken(token)
    expect(decoded.id).toBe(1)
    expect(decoded.username).toBe("testuser")
    expect(decoded.role).toBe("ADMIN")
  })

  it("should throw error when verifying invalid token", () => {
    expect(() => verifyToken("invalid.token.string")).toThrow()
  })

  it("rejects access tokens as refresh tokens", () => {
    const access = generateToken({ id: 1, username: "admin", role: "ADMIN" })
    expect(() => verifyRefreshToken(access)).toThrow()
  })

  it("issues a refresh token distinct from the access token", () => {
    const session = issueAuthTokens({ id: 2, username: "ops", role: "ADMIN", full_name: "Ops" })
    expect(session.user).toMatchObject({ id: 2, username: "ops", role: "ADMIN", fullName: "Ops" })
    const refresh = verifyRefreshToken(session.refreshToken)
    expect(refresh.tokenType).toBe("refresh")
    expect(refresh.id).toBe(2)
  })
})

describe("RefreshTokenUseCase", () => {
  it("rotates tokens from a valid refresh token", async () => {
    const original = issueAuthTokens({ id: 9, username: "admin", email: "a@b.c", role: "ADMIN", full_name: "Admin" })
    const useCase = new RefreshTokenUseCase()
    const next = await useCase.execute({ refreshToken: original.refreshToken })
    expect(next.token).toBeTruthy()
    expect(next.refreshToken).toBeTruthy()
    expect(next.user).toMatchObject({ id: 9, role: "ADMIN", fullName: "Admin" })
    expect(verifyToken(next.token).id).toBe(9)
    expect(verifyRefreshToken(next.refreshToken).tokenType).toBe("refresh")
  })

  it("rejects an access token used as refresh token", async () => {
    const access = generateToken({ id: 1, username: "admin", role: "ADMIN" })
    const useCase = new RefreshTokenUseCase()
    await expect(useCase.execute({ refreshToken: access })).rejects.toMatchObject({
      statusCode: 401,
      code: "INVALID_REFRESH_TOKEN",
    })
  })
})
