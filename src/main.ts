import { env } from './config/env'
import { buildApp } from './app'
import { initSocket } from './WebSockets/socket'

async function start() {
  const HOST = '0.0.0.0'
  const PORT = env.PORT
  const app = await buildApp()

  try {
    await app.listen({ port: PORT, host: HOST })
    console.log(`Server is running on http://${HOST}:${PORT}`)

    console.log('\n🔌 Inicializando Socket.IO...')
    initSocket(app)
    console.log('🔌 Socket.IO inicializado com sucesso!\n')
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()

//npx ts-node src/main.ts