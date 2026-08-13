export interface CreateDriverInput {
  full_name?: string | null
  username?: string | null
  email?: string | null
  password: string
  photo?: string | null
  phone?: number | null
}

export interface UpdateDriverInput {
  full_name?: string | null
  username?: string | null
  email?: string | null
  password?: string | null
  photo?: string | null
  phone?: number | null
  current_route_id?: number | null
}

export interface AssignRouteInput {
  driverId: number
  current_route_id: number
}

export interface UpdateLocationInput {
  driverId: number
  lat: number
  long: number
}

export interface LoginDriverInput {
  username: string
  password: string
}
