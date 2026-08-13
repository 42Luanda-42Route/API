import { generateToken, verifyToken } from "../../../utils/jwt"

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
})
