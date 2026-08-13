import { PrismaClient } from "@prisma/client"
import { CadeteRepository } from "../../domain/cadetes/CadeteRepository"
import { Cadete } from "../../domain/cadetes/Cadete"
import { handlePrismaError } from "../errors/PrismaErrorHandler"

export class CadetePrismaRepository implements CadeteRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(page = 1, limit = 20): Promise<{ data: Cadete[]; total: number }> {
    const [cadetes, total] = await Promise.all([
      this.prisma.cadetes.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { id: "asc" },
      }),
      this.prisma.cadetes.count(),
    ])
    return { data: cadetes.map((c: any) => this.map(c)), total }
  }

  async getById(id: number): Promise<Cadete | null> {
    const cadete = await this.prisma.cadetes.findUnique({ where: { id } })
    return cadete ? this.map(cadete) : null
  }

  async create(data: Partial<Cadete>): Promise<Cadete> {
    try {
      const cadete = await this.prisma.cadetes.create({
        data: {
          full_name: data.fullName ?? null,
          username: data.username ?? null,
          email: data.email ?? null,
          city: data.city ?? null,
          district: data.district ?? null,
          priorityList: data.priorityList ?? false,
          phone: data.phone ?? null,
          stop_id: data.stopId ?? null,
        },
      })
      return this.map(cadete)
    } catch (error) {
      handlePrismaError(error)
    }
  }

  async update(id: number, data: Partial<Cadete>): Promise<Cadete> {
    try {
      const cadete = await this.prisma.cadetes.update({
        where: { id },
        data: {
          full_name: data.fullName,
          username: data.username,
          email: data.email,
          city: data.city,
          district: data.district,
          priorityList: data.priorityList,
          phone: data.phone,
          stop_id: data.stopId,
        },
      })
      return this.map(cadete)
    } catch (error) {
      handlePrismaError(error)
    }
  }

  async delete(id: number): Promise<void> {
    try {
      await this.prisma.cadetes.delete({ where: { id } })
    } catch (error) {
      handlePrismaError(error)
    }
  }

  async findByUsernameOrEmail(usernameOrEmail: string): Promise<Cadete | null> {
    try {
      const cadete = await this.prisma.cadetes.findFirst({
        where: {
          OR: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
        },
      })
      return cadete ? this.map(cadete) : null
    } catch (error) {
      handlePrismaError(error)
    }
  }

  async getRouteInfo(cadeteId: number): Promise<any | null> {
    const cadete = await this.prisma.cadetes.findUnique({
      where: { id: cadeteId },
      select: {
        full_name: true,
        stop: {
          select: {
            id: true,
            stop_name: true,
            district: true,
            latitude: true,
            longitude: true,
            route: {
              select: {
                id: true,
                route_name: true,
                description: true,
                drivers: {
                  select: {
                    full_name: true,
                    phone: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    return cadete
  }

  private map(cadete: any): Cadete {
    return {
      id: cadete.id,
      fullName: cadete.full_name,
      username: cadete.username,
      email: cadete.email,
      city: cadete.city,
      district: cadete.district,
      priorityList: cadete.priorityList,
      phone: cadete.phone,
      stopId: cadete.stop_id,
      createdAt: cadete.createdAt,
    }
  }
}
