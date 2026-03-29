import { Driver, DriverCoordinates } from "./Driver"

export interface DriverRepository {
  list(): Promise<Driver[]>
  getById(id: number): Promise<Driver | null>
  create(data: Partial<Driver>): Promise<Driver>
  update(id: number, data: Partial<Driver>): Promise<Driver>
  delete(id: number): Promise<void>
  findByUsernameOrEmail(usernameOrEmail: string): Promise<Driver | null>
  updateLocation(driverId: number, coords: { lat: number; long: number }): Promise<DriverCoordinates>
  assignRoute(driverId: number, routeId: number): Promise<Driver>
  leaveRoute(driverId: number): Promise<Driver>
  findDriverIdByRoute(routeId: number): Promise<number | null>
}
