import { Admin } from "./Admin"

export interface AdminRepository {
  list(): Promise<Admin[]>
  getById(id: number): Promise<Admin | null>
  create(data: { fullName?: string | null; username?: string | null; email?: string | null; password: string }): Promise<Admin>
  update(id: number, data: Partial<{ fullName: string | null; username: string | null; email: string | null; password: string | null }>): Promise<Admin>
  delete(id: number): Promise<void>
  findByUsernameOrEmail(usernameOrEmail: string): Promise<Admin | null>
}
