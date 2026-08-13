import { handlePrismaError } from "../../infrastructure/errors/PrismaErrorHandler"
import { ApplicationError } from "../../application/errors/ApplicationError"

describe("PrismaErrorHandler", () => {
  it("should map P2002 to 409 conflict error", () => {
    const error = { code: "P2002", meta: { target: ["email"] } }
    expect(() => handlePrismaError(error)).toThrow(ApplicationError)
    try {
      handlePrismaError(error)
    } catch (err: any) {
      expect(err.statusCode).toBe(409)
      expect(err.message).toContain("email")
    }
  })

  it("should map P2003 to 409 foreign key error", () => {
    const error = { code: "P2003" }
    try {
      handlePrismaError(error)
    } catch (err: any) {
      expect(err.statusCode).toBe(409)
      expect(err.message).toContain("referenced record does not exist")
    }
  })

  it("should map P2025 to 404 not found error", () => {
    const error = { code: "P2025" }
    try {
      handlePrismaError(error)
    } catch (err: any) {
      expect(err.statusCode).toBe(404)
      expect(err.message).toContain("Record not found")
    }
  })

  it("should rethrow unknown errors", () => {
    const error = new Error("Unknown DB error")
    expect(() => handlePrismaError(error)).toThrow("Unknown DB error")
  })
})
