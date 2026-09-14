import jwt from "jsonwebtoken"
import { env } from "../config/env"

export interface JWTPayload {
  id: number
  email?: string | null
  username?: string | null
  full_name?: string | null
  role: string
  [key: string]: any
}

export type AuthUser = {
  id: number
  username: string | null
  email: string | null
  fullName: string | null
  role: string
}

export function authClaims(payload: JWTPayload): JWTPayload {
  const rest = { ...payload } as Record<string, unknown>
  delete rest.iat
  delete rest.exp
  delete rest.nbf
  delete rest.tokenType
  delete rest.fullName
  delete rest.current_route_id
  delete rest.stop_id

  return {
    ...rest,
    id: Number(payload.id),
    email: payload.email ?? null,
    username: payload.username ?? null,
    full_name: payload.full_name ?? payload.fullName ?? null,
    role: String(payload.role || "CADETE").toUpperCase(),
    currentRouteId: payload.currentRouteId ?? payload.current_route_id ?? null,
    stopId: payload.stopId ?? payload.stop_id ?? null,
    district: payload.district ?? null,
  }
}

export function toAuthUser(payload: JWTPayload): AuthUser {
  const claims = authClaims(payload)
  return {
    id: claims.id,
    username: claims.username ?? null,
    email: claims.email ?? null,
    fullName: claims.full_name ?? null,
    role: claims.role,
  }
}

export const generateToken = (payload: object, expiresIn?: string): string => {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: expiresIn || env.JWT_EXPIRES,
  } as jwt.SignOptions)
}

export const generateRefreshToken = (payload: object, expiresIn?: string): string => {
  return jwt.sign({ ...payload, tokenType: "refresh" }, env.JWT_SECRET, {
    expiresIn: expiresIn || env.JWT_REFRESH_EXPIRES,
  } as jwt.SignOptions)
}

export function issueAuthTokens(payload: JWTPayload, accessExpiresIn?: string) {
  const claims = authClaims(payload)
  return {
    token: generateToken(claims, accessExpiresIn),
    refreshToken: generateRefreshToken(claims),
    user: toAuthUser(claims),
  }
}

export const verifyToken = (token: string): jwt.JwtPayload => {
  return jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload
}

export const verifyTokenAllowExpired = (token: string): jwt.JwtPayload => {
  return jwt.verify(token, env.JWT_SECRET, { ignoreExpiration: true }) as jwt.JwtPayload
}

export const verifyRefreshToken = (token: string): jwt.JwtPayload => {
  const decoded = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload
  if (decoded.tokenType !== "refresh") {
    throw new Error("Invalid refresh token")
  }
  return decoded
}
