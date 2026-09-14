import {
  CreateChatUseCase,
  SendChatMessageUseCase,
} from "../../../application/chats/useCases/ChatUseCases"
import { ChatRepository } from "../../../domain/chats/ChatRepository"
import { CadeteRepository } from "../../../domain/cadetes/CadeteRepository"
import { DriverRepository } from "../../../domain/drivers/DriverRepository"
import { RouteRepository } from "../../../domain/routes/RouteRepository"

describe("Chat use cases", () => {
  let chats: jest.Mocked<ChatRepository>
  let cadetes: jest.Mocked<CadeteRepository>
  let drivers: jest.Mocked<DriverRepository>
  let routes: jest.Mocked<RouteRepository>

  beforeEach(() => {
    chats = {
      list: jest.fn(),
      getById: jest.fn(),
      findGeneral: jest.fn(),
      findByRoute: jest.fn(),
      create: jest.fn(),
      listMessages: jest.fn(),
      addMessage: jest.fn(),
      delete: jest.fn(),
    }
    cadetes = { getRouteInfo: jest.fn() } as unknown as jest.Mocked<CadeteRepository>
    drivers = { getById: jest.fn() } as unknown as jest.Mocked<DriverRepository>
    routes = { getById: jest.fn() } as unknown as jest.Mocked<RouteRepository>
  })

  it("creates a single GENERAL chat as admin", async () => {
    chats.findGeneral.mockResolvedValue(null)
    chats.create.mockResolvedValue({
      id: 1,
      fullName: "Geral",
      type: "GENERAL",
      routeId: null,
      createdAt: new Date(),
    })

    const result = await new CreateChatUseCase(chats, routes).execute(
      { id: 1, role: "ADMIN" },
      { type: "GENERAL" },
    )

    expect(result.id).toBe(1)
    expect(chats.create).toHaveBeenCalledWith({ type: "GENERAL", fullName: "Geral", routeId: null })
  })

  it("rejects a second GENERAL chat", async () => {
    chats.findGeneral.mockResolvedValue({
      id: 4,
      fullName: "Geral",
      type: "GENERAL",
      routeId: null,
      createdAt: new Date(),
    })

    await expect(
      new CreateChatUseCase(chats, routes).execute({ id: 1, role: "ADMIN" }, { type: "GENERAL" }),
    ).rejects.toMatchObject({ statusCode: 409, code: "GENERAL_CHAT_EXISTS" })
  })

  it("blocks a cadete from sending to another route chat", async () => {
    chats.getById.mockResolvedValue({
      id: 8,
      fullName: "Rota 9",
      type: "ROUTE",
      routeId: 9,
      createdAt: new Date(),
    })
    cadetes.getRouteInfo.mockResolvedValue({ stop: { route: { id: 3 } } })

    await expect(
      new SendChatMessageUseCase(chats, cadetes, drivers).execute(
        { id: 11, role: "CADETE" },
        8,
        "olá",
      ),
    ).rejects.toMatchObject({ statusCode: 403, code: "FORBIDDEN_CHAT" })
    expect(chats.addMessage).not.toHaveBeenCalled()
  })
})
