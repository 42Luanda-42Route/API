export interface CreateCadeteInput {
  full_name?: string | null
  username?: string | null
  email?: string | null
  city?: string | null
  distrit?: string | null
  prioritityList?: boolean
  phone?: number | null
  stop_id?: number | null
}

export interface UpdateCadeteInput {
  full_name?: string | null
  username?: string | null
  email?: string | null
  city?: string | null
  distrit?: string | null
  prioritityList?: boolean
  phone?: number | null
  stop_id?: number | null
}

export interface LoginCadeteInput {
  username: string
  password: string
}
