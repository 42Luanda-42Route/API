import { BoardingRequest } from "../boarding/BoardingRequest"

export type TripStatus = "ACTIVE" | "COMPLETED" | "CANCELLED"

export interface TripCounts {
  total: number
  pending: number
  approved: number
  rejected: number
}

export interface Trip {
  id: number
  routeId: number
  driverId: number
  vehicleName: string
  vehiclePlate: string
  vehicleCapacity: number
  status: TripStatus
  startedAt: Date
  endedAt: Date | null
  createdAt: Date
  updatedAt: Date
  route?: {
    id: number
    routeName: string
    description: string | null
  }
  driver?: {
    id: number
    fullName: string | null
    username: string | null
    phone: number | null
    photo: string | null
  }
  counts: TripCounts
  stats: TripCounts & { availableSeats: number }
  occupancy: number
  availableSeats: number
  boardingRequests?: BoardingRequest[]
  myRequest?: BoardingRequest | null
}

export interface TripFilters {
  status?: TripStatus
  routeId?: number
  driverId?: number
  dateFrom?: Date
  dateTo?: Date
  page: number
  limit: number
}

export interface CreateTripData {
  routeId: number
  driverId: number
  vehicleName: string
  vehiclePlate: string
  vehicleCapacity: number
}
