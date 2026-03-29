import { PrismaClient } from "@prisma/client"
import { DriverRepository } from "../../domain/drivers/DriverRepository"
import { Driver, DriverCoordinates } from "../../domain/drivers/Driver"

export class DriverPrismaRepository implements DriverRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(): Promise<Driver[]> {
    const drivers = await this.prisma.drivers.findMany()
    return drivers.map((d) => this.mapDriver(d))
  }

  async getById(id: number): Promise<Driver | null> {
    const driver = await this.prisma.drivers.findUnique({ where: { id } })
    return driver ? this.mapDriver(driver) : null
  }

  async create(data: Partial<Driver>): Promise<Driver> {
    const driver = await this.prisma.drivers.create({
      data: {
        full_name: data.fullName ?? null,
        username: data.username ?? null,
        email: data.email ?? null,
        passwrd: data.passwrd ?? null,
        photo: data.photo ?? null,
        phone: data.phone ?? null,
        current_route_id: data.currentRouteId ?? null,
      },
    })
    return this.mapDriver(driver)
  }

  async update(id: number, data: Partial<Driver>): Promise<Driver> {
    const driver = await this.prisma.drivers.update({
      where: { id },
      data: {
        full_name: data.fullName,
        username: data.username,
        email: data.email,
        passwrd: data.passwrd,
        photo: data.photo,
        phone: data.phone,
        current_route_id: data.currentRouteId,
      },
    })
    return this.mapDriver(driver)
  }

  async delete(id: number): Promise<void> {
    await this.prisma.drivers.delete({ where: { id } })
  }

  async findByUsernameOrEmail(usernameOrEmail: string): Promise<Driver | null> {
    const driver = await this.prisma.drivers.findFirst({
      where: {
        OR: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
      },
    })
    return driver ? this.mapDriver(driver) : null
  }

  async updateLocation(driverId: number, coords: { lat: number; long: number }): Promise<DriverCoordinates> {
    const existing = await this.prisma.driverCoordinates.findFirst({ where: { id_driver: driverId } })

    if (!existing) {
      const created = await this.prisma.driverCoordinates.create({
        data: { id_driver: driverId, lat: coords.lat, long: coords.long },
      })
      return this.mapCoordinates(created)
    }

    const updated = await this.prisma.driverCoordinates.update({
      where: { id: existing.id },
      data: { lat: coords.lat, long: coords.long },
    })
    return this.mapCoordinates(updated)
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
      passwrd: driver.passwrd,
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
