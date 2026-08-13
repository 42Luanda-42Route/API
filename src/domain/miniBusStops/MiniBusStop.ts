export interface MiniBusStop {
  id: number
  stopName: string | null
  district: string | null
  latitude: number | null
  longitude: number | null
  description: string | null
  routeId: number
  createdAt: Date
}
