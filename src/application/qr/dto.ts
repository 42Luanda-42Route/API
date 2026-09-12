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

export interface GenerateCadeteQrInput {
  cadeteId: number
  role: string
}

export interface AdmitCadeteByQrInput {
  driverId: number
  role: string
  qr: string
}

export interface ListBoardingRequestsInput {
  driverId: number
  role: string
  status?: "PENDING" | "APPROVED" | "REJECTED"
}

export interface UpdateBoardingRequestInput {
  driverId: number
  role: string
  requestId: number
  status: "APPROVED" | "REJECTED"
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

export interface CadeteQrPayload {
  type: "cadete"
  cadeteId: number
  iat: number
  exp: number
}

export interface BoardingEligibilityResult {
  eligible: boolean
  reason?: string
  pending?: boolean
  flagged?: boolean
  requestId?: number
  cadete: { id: number; fullName: string | null }
  route?: { id: number; routeName: string }
}

export interface AdmitCadeteResult {
  admitted: boolean
  reason?: string
  cadete: { id: number; fullName: string | null }
  route?: { id: number; routeName: string }
  driver: { id: number; routeId: number }
}
