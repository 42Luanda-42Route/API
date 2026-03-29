export interface MiniBusStop {
  id: number
  stopName: string | null
  distrit: string | null
  latitude: number | null
  longitude: number | null
  description: string | null
  routeId: number
  createdAt: Date
}
