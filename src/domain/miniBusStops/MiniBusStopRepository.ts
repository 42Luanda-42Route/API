import { MiniBusStop } from "./MiniBusStop"

export interface MiniBusStopRepository {
  list(): Promise<MiniBusStop[]>
  getById(id: number): Promise<MiniBusStop | null>
  create(data: Partial<MiniBusStop>): Promise<MiniBusStop>
  update(id: number, data: Partial<MiniBusStop>): Promise<MiniBusStop>
  delete(id: number): Promise<void>
}
