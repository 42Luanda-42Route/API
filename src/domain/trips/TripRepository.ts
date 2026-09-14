import { CreateTripData, Trip, TripFilters, TripStatus } from "./Trip"

export interface TripRepository {
  createActive(data: CreateTripData): Promise<Trip>
  findActiveByDriver(driverId: number): Promise<Trip | null>
  findActiveByRoute(routeId: number): Promise<Trip | null>
  findById(id: number): Promise<Trip | null>
  list(filters: TripFilters): Promise<{ data: Trip[]; total: number }>
  updateVehicle(
    id: number,
    data: { vehicleName?: string; vehiclePlate?: string; vehicleCapacity?: number },
  ): Promise<Trip>
  transition(id: number, status: Exclude<TripStatus, "ACTIVE">): Promise<Trip>
  delete(id: number): Promise<void>
}
