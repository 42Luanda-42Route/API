export interface CreateStopInput {
  stop_name?: string | null
  district?: string | null
  latitude?: number | null
  longitude?: number | null
  description?: string | null
  route_id: number
}

export interface UpdateStopInput {
  stop_name?: string | null
  district?: string | null
  latitude?: number | null
  longitude?: number | null
  description?: string | null
  route_id?: number | null
}
