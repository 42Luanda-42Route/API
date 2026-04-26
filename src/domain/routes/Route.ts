export interface Route {
  id: number
  routeName: string
  description?: string | null
  currentStopId?: number | null
  createdAt: Date
}

export interface DriverSummary {
  id: number
  fullName: string | null
  username: string | null
  email: string | null
  phone: number | null
  photo: string | null
  currentRouteId: number | null
}

export interface MiniBusStopSummary {
  id: number
  stopName: string | null
  distrit: string | null
  latitude: number | null
  longitude: number | null
  description: string | null
  routeId: number
}

export interface ScheduleSummary {
  id: number
  routeId: number
  departureTime: string
  arrivalTime: string
  durationMin: number
  dayType: string
  shift: string
  isActive: boolean
}

export type RouteWithRelations = Route & {
  stops: MiniBusStopSummary[]
  drivers: DriverSummary[]
  currentStop: MiniBusStopSummary | null
  schedules: ScheduleSummary[]
}

export interface RouteLocationState {
  source: "driver" | "cadete" | null
  lastUpdate: number
  sourceId: number
  sourceName: string | null
}

