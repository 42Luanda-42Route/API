import { hasRole, isSelfOrRole } from "../../../plugins/auth"

describe("Authorization helpers", () => {
  it("matches roles case-insensitively", () => {
    expect(hasRole({ id: 1, role: "admin" }, ["ADMIN"])).toBe(true)
    expect(hasRole({ id: 1, role: "CADETE" }, ["ADMIN", "DRIVER"])).toBe(false)
  })

  it("allows a driver to act on its own resource", () => {
    expect(isSelfOrRole({ id: 7, role: "DRIVER" }, 7, "DRIVER")).toBe(true)
    expect(isSelfOrRole({ id: 7, role: "DRIVER" }, 8, "DRIVER")).toBe(false)
  })

  it("allows an administrator to act on another driver's resource", () => {
    expect(isSelfOrRole({ id: 1, role: "ADMIN" }, 8, "DRIVER", ["ADMIN"])).toBe(true)
  })
})
