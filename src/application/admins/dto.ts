export interface CreateAdminInput {
  full_name?: string | null
  username?: string | null
  email?: string | null
  password: string
}

export interface UpdateAdminInput {
  full_name?: string | null
  username?: string | null
  email?: string | null
  password?: string | null
}

export interface LoginAdminInput {
  username: string
  password: string
}
