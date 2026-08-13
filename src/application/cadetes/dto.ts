export interface CreateCadeteInput {
  full_name?: string | null
  username?: string | null
  email?: string | null
  city?: string | null
  district?: string | null
  priorityList?: boolean
  phone?: number | null
  stop_id?: number | null
}

export interface UpdateCadeteInput {
  full_name?: string | null
  username?: string | null
  email?: string | null
  city?: string | null
  district?: string | null
  priorityList?: boolean
  phone?: number | null
  stop_id?: number | null
}
