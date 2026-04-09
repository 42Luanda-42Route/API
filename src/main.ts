import { buildApp } from './app'
import { initSocket } from './WebSockets/socket';

async function start() {
  const HOST = '0.0.0.0'
  const app = await buildApp()

  try{
    await app.listen({ port: 3000, host: HOST }).then(() =>{
      console.log(`Server is running on http://${HOST}:3000`)
      
      // ✅ Inicializar Socket.IO APÓS servidor estar listening
      console.log('\n🔌 Inicializando Socket.IO...');
      initSocket(app);
      console.log('🔌 Socket.IO inicializado com sucesso!\n');
   })
  }catch(err)
  {
    //app.log.error(err);
    process.exit(1);
  }
}

start()

//npx ts-node src/main.ts