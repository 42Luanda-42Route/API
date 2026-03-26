export interface CreateRouteInput {
  routeName: string
  description?: string | null
}

export interface AddStopsInput {
  routeId: number
  stopIds: number[]
}
