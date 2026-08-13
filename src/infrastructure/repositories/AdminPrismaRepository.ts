import { PrismaClient } from "@prisma/client"
import { AdminRepository } from "../../domain/admins/AdminRepository"
import { Admin } from "../../domain/admins/Admin"
import { handlePrismaError } from "../errors/PrismaErrorHandler"

export class AdminPrismaRepository implements AdminRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(page = 1, limit = 20): Promise<{ data: Admin[]; total: number }> {
    const [admins, total] = await Promise.all([
      this.prisma.admins.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { id: "asc" },
      }),
      this.prisma.admins.count(),
    ])
    return { data: admins.map((a: any) => this.mapAdmin(a)), total }
  }

  async getById(id: number): Promise<Admin | null> {
    const admin = await this.prisma.admins.findUnique({ where: { id } })
    return admin ? this.mapAdmin(admin) : null
  }

  async create(data: { fullName?: string | null; username?: string | null; email?: string | null; password: string }): Promise<Admin> {
    try {
      const admin = await this.prisma.admins.create({
        data: {
          full_name: data.fullName ?? null,
          username: data.username ?? null,
          email: data.email ?? null,
          password: data.password,
        },
      })
      return this.mapAdmin(admin)
    } catch (error) {
      handlePrismaError(error)
    }
  }

  async update(id: number, data: Partial<{ fullName: string | null; username: string | null; email: string | null; password: string | null }>): Promise<Admin> {
    try {
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
    } catch (error) {
      handlePrismaError(error)
    }
  }

  async delete(id: number): Promise<void> {
    try {
      await this.prisma.admins.delete({ where: { id } })
    } catch (error) {
      handlePrismaError(error)
    }
  }

  async findByUsernameOrEmail(usernameOrEmail: string): Promise<Admin | null> {
    try {
      const admin = await this.prisma.admins.findFirst({
        where: {
          OR: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
        },
      })
      return admin ? this.mapAdmin(admin) : null
    } catch (error) {
      handlePrismaError(error)
    }
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
