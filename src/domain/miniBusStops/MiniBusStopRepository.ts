import { MiniBusStop } from "./MiniBusStop"

export interface MiniBusStopRepository {
  list(page?: number, limit?: number): Promise<{ data: MiniBusStop[]; total: number }>
  getById(id: number): Promise<MiniBusStop | null>
  create(data: Partial<MiniBusStop>): Promise<MiniBusStop>
  update(id: number, data: Partial<MiniBusStop>): Promise<MiniBusStop>
  delete(id: number): Promise<void>
}
