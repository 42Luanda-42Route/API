import { ApplicationError } from "../../application/errors/ApplicationError"

/**
 * Maps known Prisma errors to user-friendly ApplicationErrors.
 */
export function handlePrismaError(error: unknown): never {
  const prismaError = error as any

  if (prismaError?.code === "P2002") {
    const fields = prismaError.meta?.target?.join(", ") || "field"
    throw new ApplicationError(`A record with this ${fields} already exists`, 409)
  }

  if (prismaError?.code === "P2003") {
    throw new ApplicationError("Cannot complete operation: referenced record does not exist", 409)
  }

  if (prismaError?.code === "P2025") {
    throw new ApplicationError("Record not found", 404)
  }

  throw error
}
