import { PrismaClient } from "@prisma/client"
import { AdminRepository } from "../../domain/admins/AdminRepository"
import { Admin } from "../../domain/admins/Admin"

export class AdminPrismaRepository implements AdminRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(): Promise<Admin[]> {
    const admins = await this.prisma.admins.findMany()
    return admins.map((a) => this.mapAdmin(a))
  }

  async getById(id: number): Promise<Admin | null> {
    const admin = await this.prisma.admins.findUnique({ where: { id } })
    return admin ? this.mapAdmin(admin) : null
  }

  async create(data: { fullName?: string | null; username?: string | null; email?: string | null; password: string }): Promise<Admin> {
    const admin = await this.prisma.admins.create({
      data: {
        full_name: data.fullName ?? null,
        username: data.username ?? null,
        email: data.email ?? null,
        password: data.password,
      },
    })

    return this.mapAdmin(admin)
  }

  async update(id: number, data: Partial<{ fullName: string | null; username: string | null; email: string | null; password: string | null }>): Promise<Admin> {
    const admin = await this.prisma.admins.update({
      where: { id },
      data: {
        full_name: data.fullName,
        username: data.username,
        email: data.email,
        password: data.password ?? undefined,
      },
    })

    return this.mapAdmin(admin)
  }

  async delete(id: number): Promise<void> {
    await this.prisma.admins.delete({ where: { id } })
  }

  async findByUsernameOrEmail(usernameOrEmail: string): Promise<Admin | null> {
    const admin = await this.prisma.admins.findFirst({
      where: {
        OR: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
      },
    })
    return admin ? this.mapAdmin(admin) : null
  }

  private mapAdmin(admin: any): Admin {
    return {
      id: admin.id,
      fullName: admin.full_name,
      username: admin.username,
      email: admin.email,
      password: admin.password,
      createdAt: admin.createdAt,
    }
  }
}
