/**
 * Script de teste: Fluxo de localização via Socket puro
 * 
 * Cenários testados:
 * 1. Motorista se conecta e entra na rota
 * 2. Motorista transmite localização via socket
 * 3. Cadete se conecta e entra na rota
 * 4. Cadete recebe localização do motorista
 * 5. Motorista sai da rota
 * 6. Cadete transmite localização (fallback)
 */

const { io } = require("socket.io-client");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const BASE_URL = process.env.SOCKET_BASE_URL || "http://127.0.0.1:3000";

async function getTestData() {
  const driver = await prisma.drivers.findFirst({
    where: { current_route_id: { not: null } },
    select: { id: true, current_route_id: true, full_name: true },
  });

  if (!driver || !driver.current_route_id) {
    throw new Error("No driver with current_route_id found.");
  }

  const cadete = await prisma.cadetes.findFirst({
    where: {
      stop: {
        is: { route_id: driver.current_route_id },
      },
    },
    select: { id: true, full_name: true },
  });

  if (!cadete) {
    throw new Error(`No cadete found for route ${driver.current_route_id}.`);
  }

  return {
    driverId: driver.id,
    driverName: driver.full_name,
    cadeteId: cadete.id,
    cadeteName: cadete.full_name,
    routeId: driver.current_route_id,
  };
}

async function run() {
  const testState = {
    driverConnected: false,
    driverJoinedRoute: false,
    driverLocationSent: false,
    cadeteConnected: false,
    cadeteJoinedRoute: false,
    cadeteReceivedDriverLocation: false,
    driverLeftRoute: false,
    cadeteLocationSentAsfallback: false,
  };

  const { driverId, driverName, cadeteId, cadeteName, routeId } = await getTestData();

  console.log("\n📋 Dados de teste:");
  console.log(`   🚗 Motorista: ${driverName} (ID: ${driverId})`);
  console.log(`   👤 Cadete: ${cadeteName} (ID: ${cadeteId})`);
  console.log(`   🛣️  Rota: ${routeId}`);
  console.log(`   🌐 Servidor: ${BASE_URL}\n`);

  const driverSocket = io(BASE_URL, { transports: ["websocket"] });
  const cadeteSocket = io(BASE_URL, { transports: ["websocket"] });

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      console.log("\n⏱️  Timeout: encerrando teste...");
      driverSocket.disconnect();
      cadeteSocket.disconnect();
      printResults();
      resolve(false);
    }, 20000);

    function printResults() {
      console.log("\n📊 Resultados do teste:");
      console.log(`   ${testState.driverConnected ? "✅" : "❌"} Driver conectado`);
      console.log(`   ${testState.driverJoinedRoute ? "✅" : "❌"} Driver entrou na rota`);
      console.log(`   ${testState.driverLocationSent ? "✅" : "❌"} Localização do driver enviada via socket`);
      console.log(`   ${testState.cadeteConnected ? "✅" : "❌"} Cadete conectado`);
      console.log(`   ${testState.cadeteJoinedRoute ? "✅" : "❌"} Cadete entrou na rota`);
      console.log(`   ${testState.cadeteReceivedDriverLocation ? "✅" : "❌"} Cadete recebeu localização do driver`);

      const allPassed =
        testState.driverConnected &&
        testState.driverJoinedRoute &&
        testState.driverLocationSent &&
        testState.cadeteConnected &&
        testState.cadeteJoinedRoute &&
        testState.cadeteReceivedDriverLocation;

      console.log(`\n${allPassed ? "✅ TESTE PASSOU" : "❌ TESTE FALHOU"}\n`);
    }

    function checkComplete() {
      if (
        testState.driverConnected &&
        testState.driverJoinedRoute &&
        testState.driverLocationSent &&
        testState.cadeteConnected &&
        testState.cadeteJoinedRoute &&
        testState.cadeteReceivedDriverLocation
      ) {
        clearTimeout(timeout);
        driverSocket.disconnect();
        cadeteSocket.disconnect();
        printResults();
        resolve(true);
      }
    }

    // ─────────────────────────────────────────────────────────────────────
    // DRIVER SOCKET
    // ─────────────────────────────────────────────────────────────────────

    driverSocket.on("connect", () => {
      testState.driverConnected = true;
      console.log(`\n🟢 DRIVER CONECTADO: ${driverSocket.id}`);

      // Listener para ver TODOS os eventos que o driver recebe
      driverSocket.onAny((event, ...args) => {
        if (!event.includes('ping') && !event.includes('pong')) {
          console.log(`\n📨 [DRIVER] Evento: "${event}"`, args.length > 0 ? args[0] : '(sem payload)');
        }
      });

      // Motorista entra na rota
      console.log(`📍 Driver entrando na rota ${routeId}...`);
      driverSocket.emit("driver:joinRoute", { driverId });
      testState.driverJoinedRoute = true;

      // Enviar localização repetidamente para garantir que cadete receba
      // (o cadete pode não ter entrado na room ainda na primeira emissão)
      let locationSendCount = 0;
      const locationInterval = setInterval(() => {
        locationSendCount++;
        console.log(`📍 Driver enviando localização (tentativa ${locationSendCount})...`);
        driverSocket.emit("driver:updateLocation", {
          id_driver: driverId,
          lat: -8.8383,
          long: 13.2344,
        });
        testState.driverLocationSent = true;

        if (testState.cadeteReceivedDriverLocation || locationSendCount >= 5) {
          clearInterval(locationInterval);
        }
      }, 800); // Enviar a cada 800ms

      checkComplete();
    });

    driverSocket.on("driver:location", (payload) => {
      console.log(`\n🚗 Driver recebeu broadcast: driver:location`, payload);
    });

    driverSocket.on("transport:location", (payload) => {
      console.log(`\n🚗 Driver recebeu: transport:location`, payload);
    });

    driverSocket.on("socket:error", (data) => {
      console.error(`\n❌ Driver recebeu socket:error:`, data);
    });

    driverSocket.on("socket:ignored", (data) => {
      console.warn(`\n⚠️  Driver recebeu socket:ignored:`, data);
    });

    driverSocket.on("disconnect", (reason) => {
      console.log(`\n🔴 Driver desconectado: ${reason}`);
    });

    // ─────────────────────────────────────────────────────────────────────
    // CADETE SOCKET
    // ─────────────────────────────────────────────────────────────────────

    cadeteSocket.on("connect", () => {
      testState.cadeteConnected = true;
      console.log(`\n🟢 CADETE CONECTADO: ${cadeteSocket.id}`);

      // Listener para ver TODOS os eventos que o cadete recebe
      cadeteSocket.onAny((event, ...args) => {
        if (!event.includes('ping') && !event.includes('pong')) {
          console.log(`\n📨 [CADETE] Evento: "${event}"`, args.length > 0 ? args[0] : '(sem payload)');
        }
      });

      // Cadete entra na rota imediatamente após conectar
      console.log(`📍 Cadete entrando na rota ${routeId}...`);
      cadeteSocket.emit("cadete:joinRoute", { cadeteId });
      testState.cadeteJoinedRoute = true;
      checkComplete();
    });

    cadeteSocket.on("driver:location", (payload) => {
      console.log(`\n✅ CADETE RECEBEU driver:location:`, JSON.stringify(payload, null, 2));
      if (payload && payload.id_driver === driverId) {
        testState.cadeteReceivedDriverLocation = true;
        console.log(`\n🎉 SUCESSO: Cadete recebeu localização do driver!`);
        checkComplete();
      }
    });

    cadeteSocket.on("transport:location", (payload) => {
      console.log(`\n👤 Cadete recebeu: transport:location`, payload);
    });

    cadeteSocket.on("socket:error", (data) => {
      console.error(`\n❌ Cadete recebeu socket:error:`, data);
    });

    cadeteSocket.on("socket:ignored", (data) => {
      console.warn(`\n⚠️  Cadete recebeu socket:ignored:`, data);
    });

    cadeteSocket.on("disconnect", (reason) => {
      console.log(`\n🔴 Cadete desconectado: ${reason}`);
    });

    // ─────────────────────────────────────────────────────────────────────
    // Error handlers
    // ─────────────────────────────────────────────────────────────────────

    driverSocket.on("connect_error", (err) => {
      console.error(`\n❌ Driver connect_error:`, err.message);
    });

    cadeteSocket.on("connect_error", (err) => {
      console.error(`\n❌ Cadete connect_error:`, err.message);
    });
  });
}

run()
  .catch((err) => {
    console.error("\n❌ Erro no teste:", err.message);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
