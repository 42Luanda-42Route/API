import { PrismaClient } from '@prisma/client'

// Singleton Prisma client to be shared across HTTP and WebSocket layers
const prisma = new PrismaClient()

export default prisma
