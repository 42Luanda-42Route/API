import { PrismaClient } from "@prisma/client"
import { DriverRepository } from "../../domain/drivers/DriverRepository"
import { Driver, DriverCoordinates } from "../../domain/drivers/Driver"
import { handlePrismaError } from "../errors/PrismaErrorHandler"

export class DriverPrismaRepository implements DriverRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(page = 1, limit = 20): Promise<{ data: Driver[]; total: number }> {
    const [drivers, total] = await Promise.all([
      this.prisma.drivers.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { id: "asc" },
      }),
      this.prisma.drivers.count(),
    ])
    return { data: drivers.map((d: any) => this.mapDriver(d)), total }
  }

  async getById(id: number): Promise<Driver | null> {
    const driver = await this.prisma.drivers.findUnique({ where: { id } })
    return driver ? this.mapDriver(driver) : null
  }

  async create(data: Partial<Driver>): Promise<Driver> {
    try {
      const driver = await this.prisma.drivers.create({
        data: {
          full_name: data.fullName ?? null,
          username: data.username ?? null,
          email: data.email ?? null,
          password: data.password ?? null,
          photo: data.photo ?? null,
          phone: data.phone ?? null,
          current_route_id: data.currentRouteId ?? null,
        },
      })
      return this.mapDriver(driver)
    } catch (error) {
      handlePrismaError(error)
    }
  }

  async update(id: number, data: Partial<Driver>): Promise<Driver> {
    try {
      const driver = await this.prisma.drivers.update({
        where: { id },
        data: {
          full_name: data.fullName,
          username: data.username,
          email: data.email,
          password: data.password,
          photo: data.photo,
          phone: data.phone,
          current_route_id: data.currentRouteId,
        },
      })
      return this.mapDriver(driver)
    } catch (error) {
      handlePrismaError(error)
    }
  }

  async delete(id: number): Promise<void> {
    try {
      await this.prisma.drivers.delete({ where: { id } })
    } catch (error) {
      handlePrismaError(error)
    }
  }

  async findByUsernameOrEmail(usernameOrEmail: string): Promise<Driver | null> {
    try {
      const driver = await this.prisma.drivers.findFirst({
        where: {
          OR: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
        },
      })
      return driver ? this.mapDriver(driver) : null
    } catch (error) {
      handlePrismaError(error)
    }
  }

  async updateLocation(driverId: number, coords: { lat: number; long: number }): Promise<DriverCoordinates> {
    const result = await this.prisma.driverCoordinates.upsert({
      where: { id_driver: driverId },
      update: { lat: coords.lat, long: coords.long },
      create: { id_driver: driverId, lat: coords.lat, long: coords.long },
    })
    return this.mapCoordinates(result)
  }

  async assignRoute(driverId: number, routeId: number): Promise<Driver> {
    const driver = await this.prisma.drivers.update({
      where: { id: driverId },
      data: { current_route_id: routeId },
    })
    return this.mapDriver(driver)
  }

  async leaveRoute(driverId: number): Promise<Driver> {
    const driver = await this.prisma.drivers.update({
      where: { id: driverId },
      data: { current_route_id: null },
    })
    return this.mapDriver(driver)
  }

  async findDriverIdByRoute(routeId: number): Promise<number | null> {
    const driver = await this.prisma.drivers.findFirst({
      where: { current_route_id: routeId },
      select: { id: true },
    })
    return driver?.id ?? null
  }

  private mapDriver(driver: any): Driver {
    return {
      id: driver.id,
      fullName: driver.full_name,
      username: driver.username,
      email: driver.email,
      password: driver.password,
      photo: driver.photo,
      phone: driver.phone,
      currentRouteId: driver.current_route_id,
      createdAt: driver.createdAt,
    }
  }

  private mapCoordinates(coords: any): DriverCoordinates {
    return {
      id: coords.id,
      lat: coords.lat,
      long: coords.long,
      driverId: coords.id_driver,
      createdAt: coords.createdAt,
    }
  }
}
