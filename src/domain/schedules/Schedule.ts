export interface Schedule {
  id: number
  routeId: number
  departureTime: string
  arrivalTime: string
  durationMin: number
  dayType: string
  shift: string
  isActive: boolean
  createdAt: Date
}

export interface ScheduleWithRoute extends Schedule {
  routeName: string
}
