import { FastifyReply, FastifyRequest } from "fastify"
import { CreateAdminUseCase } from "../../../application/admins/useCases/CreateAdmin"
import { ListAdminsUseCase } from "../../../application/admins/useCases/ListAdmins"
import { GetAdminByIdUseCase } from "../../../application/admins/useCases/GetAdminById"
import { UpdateAdminUseCase } from "../../../application/admins/useCases/UpdateAdmin"
import { DeleteAdminUseCase } from "../../../application/admins/useCases/DeleteAdmin"
import { LoginAdminUseCase } from "../../../application/admins/useCases/LoginAdmin"
import { ApplicationError } from "../../../application/errors/ApplicationError"
import { CreateAdminInput, LoginAdminInput, UpdateAdminInput } from "../../../application/admins/dto"

export class AdminController {
  constructor(
    private readonly createAdmin: CreateAdminUseCase,
    private readonly listAdmins: ListAdminsUseCase,
    private readonly getAdminById: GetAdminByIdUseCase,
    private readonly updateAdmin: UpdateAdminUseCase,
    private readonly deleteAdmin: DeleteAdminUseCase,
    private readonly loginAdmin: LoginAdminUseCase,
  ) {}

  async list(req: FastifyRequest, reply: FastifyReply) {
    try {
      const result = await this.listAdmins.execute()
      return reply.send(result)
    } catch (error) {
      return this.handle(error, reply)
    }
  }

  async getById(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const result = await this.getAdminById.execute(Number(req.params.id))
      return reply.send(result)
    } catch (error) {
      return this.handle(error, reply)
    }
  }

  async create(req: FastifyRequest<{ Body: CreateAdminInput }>, reply: FastifyReply) {
    try {
      const result = await this.createAdmin.execute(req.body)
      const { password, ...rest } = result as any
      return reply.code(201).send(rest)
    } catch (error) {
      return this.handle(error, reply)
    }
  }

  async update(req: FastifyRequest<{ Params: { id: string }; Body: UpdateAdminInput }>, reply: FastifyReply) {
    try {
      const result = await this.updateAdmin.execute(Number(req.params.id), req.body)
      const { password, ...rest } = result as any
      return reply.send(rest)
    } catch (error) {
      return this.handle(error, reply)
    }
  }

  async delete(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      await this.deleteAdmin.execute(Number(req.params.id))
      return reply.status(204).send()
    } catch (error) {
      return this.handle(error, reply)
    }
  }

  async login(req: FastifyRequest<{ Body: LoginAdminInput }>, reply: FastifyReply) {
    try {
      const result = await this.loginAdmin.execute(req.body)
      return reply.send(result)
    } catch (error) {
      return this.handle(error, reply)
    }
  }

  private handle(error: unknown, reply: FastifyReply) {
    if (error instanceof ApplicationError) {
      return reply.status(error.statusCode).send({ error: error.message })
    }
    reply.log.error(error)
    return reply.status(500).send({ error: "Internal server error" })
  }
}
