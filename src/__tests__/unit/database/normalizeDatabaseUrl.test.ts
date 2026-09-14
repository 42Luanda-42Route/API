import { normalizeDatabaseUrl } from "../../../infrastructure/database/prismaClient"

describe("normalizeDatabaseUrl", () => {
  it("fixes invalid channel_binding and adds Neon pooler params", () => {
    const url = normalizeDatabaseUrl(
      "postgresql://u:p@ep-x-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=requiredisable",
    )
    const parsed = new URL(url)
    expect(parsed.searchParams.get("channel_binding")).toBeNull()
    expect(parsed.searchParams.get("connect_timeout")).toBe("15")
    expect(parsed.searchParams.get("pgbouncer")).toBe("true")
    expect(parsed.searchParams.get("sslmode")).toBe("require")
  })

  it("does not override an explicit connect_timeout", () => {
    const url = normalizeDatabaseUrl("postgresql://u:p@localhost:5432/db?connect_timeout=3")
    expect(new URL(url).searchParams.get("connect_timeout")).toBe("3")
  })
})
