import jwt from 'jsonwebtoken';

export interface JWTPayload {
  id: number;
  email?: string | null;
  username?: string | null;
  full_name?: string | null;
  role: string;
  [key: string]: any;
}

export const generateToken = (payload: object, expiresIn?: string): string => {
  return jwt.sign(payload, process.env.JWT_SECRET as string, {
    expiresIn: expiresIn || process.env.JWT_EXPIRES || '1h',
  } as jwt.SignOptions);
};

export const verifyToken = (token: string): jwt.JwtPayload => {
  return jwt.verify(token, process.env.JWT_SECRET as string) as jwt.JwtPayload;
};
