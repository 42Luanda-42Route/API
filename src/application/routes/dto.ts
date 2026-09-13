export interface CreateRouteInput {
  routeName: string
  description?: string | null
}

export interface UpdateRouteInput {
  routeName?: string
  description?: string | null
}

export interface AddStopsInput {
  routeId: number
  stopIds: number[]
}
