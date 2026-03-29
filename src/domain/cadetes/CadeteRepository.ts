import { Cadete } from "./Cadete"

export interface CadeteRepository {
  list(): Promise<Cadete[]>
  getById(id: number): Promise<Cadete | null>
  create(data: Partial<Cadete>): Promise<Cadete>
  update(id: number, data: Partial<Cadete>): Promise<Cadete>
  delete(id: number): Promise<void>
  findByUsernameOrEmail(usernameOrEmail: string): Promise<Cadete | null>
  getRouteInfo(cadeteId: number): Promise<any | null>
}
