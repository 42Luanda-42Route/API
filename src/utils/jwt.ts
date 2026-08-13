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

export const generateToken = (payload: object, expiresIn?: string): string => {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: expiresIn || env.JWT_EXPIRES,
  } as jwt.SignOptions)
}

export const verifyToken = (token: string): jwt.JwtPayload => {
  return jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload
}
