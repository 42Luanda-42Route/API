import { PrismaClient } from "@prisma/client"
import { CadeteRepository } from "../../domain/cadetes/CadeteRepository"
import { Cadete } from "../../domain/cadetes/Cadete"

export class CadetePrismaRepository implements CadeteRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(): Promise<Cadete[]> {
    const cadetes = await this.prisma.cadetes.findMany()
    return cadetes.map((c) => this.map(c))
  }

  async getById(id: number): Promise<Cadete | null> {
    const cadete = await this.prisma.cadetes.findUnique({ where: { id } })
    return cadete ? this.map(cadete) : null
  }

  async create(data: Partial<Cadete>): Promise<Cadete> {
    const cadete = await this.prisma.cadetes.create({
      data: {
        full_name: data.fullName ?? null,
        username: data.username ?? null,
        email: data.email ?? null,
        city: data.city ?? null,
        distrit: data.distrit ?? null,
        prioritityList: data.prioritityList ?? false,
        phone: data.phone ?? null,
        stop_id: data.stopId ?? null,
      },
    })

    return this.map(cadete)
  }

  async update(id: number, data: Partial<Cadete>): Promise<Cadete> {
    const cadete = await this.prisma.cadetes.update({
      where: { id },
      data: {
        full_name: data.fullName,
        username: data.username,
        email: data.email,
        city: data.city,
        distrit: data.distrit,
        prioritityList: data.prioritityList,
        phone: data.phone,
        stop_id: data.stopId,
      },
    })

    return this.map(cadete)
  }

  async delete(id: number): Promise<void> {
    await this.prisma.cadetes.delete({ where: { id } })
  }

  async findByUsernameOrEmail(usernameOrEmail: string): Promise<Cadete | null> {
    const cadete = await this.prisma.cadetes.findFirst({
      where: {
        OR: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
      },
    })
    return cadete ? this.map(cadete) : null
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
            distrit: true,
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
      distrit: cadete.distrit,
      prioritityList: cadete.prioritityList,
      phone: cadete.phone,
      stopId: cadete.stop_id,
      createdAt: cadete.createdAt,
    }
  }
}
