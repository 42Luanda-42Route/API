export interface Driver {
  id: number
  fullName: string | null
  username: string | null
  email: string | null
  passwrd: string | null
  photo: string | null
  phone: number | null
  currentRouteId: number | null
  createdAt: Date
}

export interface DriverCoordinates {
  id: number
  lat: number
  long: number
  driverId: number
  createdAt: Date
}
