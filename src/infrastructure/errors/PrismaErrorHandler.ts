import { ApplicationError } from "../../application/errors/ApplicationError"

function fieldList(error: { meta?: { target?: string[] | string; field_name?: string } }): string {
  const target = error.meta?.target
  if (Array.isArray(target) && target.length) return target.join(", ")
  if (typeof target === "string" && target) return target
  if (error.meta?.field_name) return error.meta.field_name
  return "campo único"
}

function prismaHost(message: string): string | undefined {
  const match = message.match(/at `([^`]+)`/)
  return match?.[1]
}

function isDatabaseUnreachable(error: {
  name?: string
  code?: string
  errorCode?: string
  message?: string
}): boolean {
  const code = error.code || error.errorCode
  if (["P1000", "P1001", "P1002", "P1017"].includes(String(code))) return true
  if (error.name === "PrismaClientInitializationError") return true
  const message = String(error.message || "")
  return /Can't reach database server|timed out fetching a new connection|Server has closed the connection|Connection refused/i.test(
    message,
  )
}

/**
 * Maps known Prisma errors to specific ApplicationErrors.
 */
export function handlePrismaError(error: unknown): never {
  const prismaError = error as {
    name?: string
    code?: string
    errorCode?: string
    message?: string
    meta?: { target?: string[] | string; field_name?: string; model_name?: string }
  }

  if (isDatabaseUnreachable(prismaError)) {
    const host = prismaHost(String(prismaError.message || ""))
    throw new ApplicationError(
      host
        ? `A base de dados em ${host} está inacessível. O login e as restantes operações não podem ser concluídos.`
        : "A base de dados está inacessível. O login e as restantes operações não podem ser concluídos.",
      503,
      {
        code: "DATABASE_UNREACHABLE",
        hint: "Confirme DATABASE_URL no .env. Neon tem de estar acordado; em local use o Postgres do docker-compose (porta POSTGRES_PORT, por omissão 5434). Depois reinicie a API.",
      },
    )
  }

  if (prismaError?.code === "P2002") {
    const fields = fieldList(prismaError)
    throw new ApplicationError(
      `Já existe um registo com o mesmo valor em «${fields}». Não é possível criar ou atualizar com dados duplicados.`,
      409,
      {
        code: "DUPLICATE_RECORD",
        hint: "Altere o valor único (username, email, stop_name, etc.) ou atualize o registo existente.",
      },
    )
  }

  if (prismaError?.code === "P2003") {
    const field = prismaError.meta?.field_name || "relação"
    throw new ApplicationError(
      `Não é possível concluir a operação: a chave estrangeira «${field}» impede criar, atualizar ou apagar este registo.`,
      409,
      {
        code: "FOREIGN_KEY_CONSTRAINT",
        hint: "Se estiver a apagar, conclua ou cancele primeiro as viagens ativas e volte a tentar. Se estiver a criar, confirme que o id referenciado existe.",
      },
    )
  }

  if (prismaError?.code === "P2014") {
    throw new ApplicationError(
      "A operação viola uma relação obrigatória entre registos.",
      409,
      {
        code: "REQUIRED_RELATION",
        hint: "Remova ou reassocie os registos dependentes antes de repetir a operação.",
      },
    )
  }

  if (prismaError?.code === "P2025") {
    throw new ApplicationError(
      "Registo não encontrado para atualizar ou apagar.",
      404,
      {
        code: "RECORD_NOT_FOUND",
        hint: "Confirme o id no URL e volte a listar o recurso.",
      },
    )
  }

  throw error
}
