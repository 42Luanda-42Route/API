import {
  canControlDriver,
  canManageRouteSubscriptions,
  getSocketCorsOrigin,
} from "../../../WebSockets/socket"

describe("Socket authorization contract", () => {
  it("only permits drivers to control their own identity unless they are administrators", () => {
    expect(canControlDriver({ id: 4, role: "DRIVER" }, 4)).toBe(true)
    expect(canControlDriver({ id: 4, role: "DRIVER" }, 5)).toBe(false)
    expect(canControlDriver({ id: 1, role: "ADMIN" }, 5)).toBe(true)
    expect(canControlDriver({ id: 4, role: "CADETE" }, 4)).toBe(false)
  })

  it("reserves explicit route subscriptions for administrators", () => {
    expect(canManageRouteSubscriptions({ id: 1, role: "ADMIN" })).toBe(true)
    expect(canManageRouteSubscriptions({ id: 1, role: "DRIVER" })).toBe(false)
    expect(canManageRouteSubscriptions({ id: 1, role: "CADETE" })).toBe(false)
  })

  it("uses the configured Socket.IO CORS origins", () => {
    expect(getSocketCorsOrigin("*")).toBe("*")
    expect(getSocketCorsOrigin("https://admin.example, https://app.example")).toEqual([
      "https://admin.example",
      "https://app.example",
    ])
  })
})
