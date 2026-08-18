export interface ScanRouteQrInput {
  driverId: number
  qr: string
}

export interface GenerateBoardingQrInput {
  driverId: number
}

export interface ScanBoardingQrInput {
  cadeteId: number
  role: string
  qr: string
}

export interface RouteQrPayload {
  type: "route"
  routeId: number
}

export interface BoardingQrPayload {
  type: "boarding"
  routeId: number
  driverId: number
  iat: number
  exp: number
}

export interface BoardingEligibilityResult {
  eligible: boolean
  reason?: string
  cadete: { id: number; fullName: string | null }
  route?: { id: number; routeName: string }
}
