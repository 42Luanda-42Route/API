const { io } = require("socket.io-client");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const BASE_URL = process.env.SOCKET_BASE_URL || "http://127.0.0.1:3000";

async function getTestIds() {
  const driver = await prisma.drivers.findFirst({
    where: { current_route_id: { not: null } },
    select: { id: true, current_route_id: true },
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
    select: { id: true },
  });

  if (!cadete) {
    throw new Error(`No cadete found for route ${driver.current_route_id}.`);
  }

  return { driverId: driver.id, cadeteId: cadete.id, routeId: driver.current_route_id };
}

async function run() {
  const state = {
    connectedDriver: false,
    connectedCadete: false,
    gotDriverLocation: false,
    gotIgnoredFromCadete: false,
    gotTransportLocation: false,
    gotSocketError: false,
  };

  const { driverId, cadeteId, routeId } = await getTestIds();

  console.log("[socket-test] baseUrl:", BASE_URL);
  console.log("[socket-test] using ids:", { driverId, cadeteId, routeId });

  const driverSocket = io(BASE_URL, { transports: ["websocket"] });
  const cadeteSocket = io(BASE_URL, { transports: ["websocket"] });
  const invalidDriverSocket = io(BASE_URL, { transports: ["websocket"] });

  const done = new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(false), 25000);

    function checkDone() {
      if (
        state.connectedDriver &&
        state.connectedCadete &&
        state.gotDriverLocation &&
        state.gotIgnoredFromCadete &&
        state.gotTransportLocation &&
        state.gotSocketError
      ) {
        clearTimeout(timeout);
        resolve(true);
      }
    }

    driverSocket.on("connect", () => {
      state.connectedDriver = true;
      console.log("[socket-test] driver connected");
      driverSocket.emit("driver:joinRoute", { driverId });
      checkDone();
    });

    cadeteSocket.on("connect", () => {
      state.connectedCadete = true;
      console.log("[socket-test] cadete connected");
      cadeteSocket.emit("cadete:joinRoute", { cadeteId });
      checkDone();
    });

    invalidDriverSocket.on("connect", () => {
      invalidDriverSocket.emit("driver:updateLocation", {
        id_driver: -99999,
        lat: -8.82,
        long: 13.23,
      });
    });

    cadeteSocket.on("driver:location", (payload) => {
      console.log("[socket-test] cadete received driver:location", payload);
      if (payload && payload.id_driver === driverId) {
        state.gotDriverLocation = true;
        // driver ativo: próxima emissão do cadete deve ser ignorada
        cadeteSocket.emit("cadete:updateLocation", {
          cadeteId,
          lat: -8.83,
          long: 13.24,
        });
      }
      checkDone();
    });

    cadeteSocket.on("socket:ignored", (payload) => {
      console.log("[socket-test] cadete received socket:ignored", payload);
      if (payload && payload.event === "cadete:updateLocation") {
        state.gotIgnoredFromCadete = true;
        // after driver timeout (10s), cadete update should be broadcast as transport:location
        setTimeout(() => {
          cadeteSocket.emit("cadete:updateLocation", {
            cadeteId,
            lat: -8.831,
            long: 13.241,
          });
        }, 11000);
      }
      checkDone();
    });

    cadeteSocket.on("transport:location", (payload) => {
      console.log("[socket-test] cadete received transport:location", payload);
      if (payload && payload.cadeteId === cadeteId) {
        state.gotTransportLocation = true;
      }
      checkDone();
    });

    invalidDriverSocket.on("socket:error", (payload) => {
      console.log("[socket-test] invalid driver received socket:error", payload);
      if (payload && payload.event === "driver:updateLocation") {
        state.gotSocketError = true;
      }
      checkDone();
    });

    setTimeout(() => {
      driverSocket.emit("driver:updateLocation", {
        id_driver: driverId,
        lat: -8.83833,
        long: 13.23444,
      });
    }, 1200);
  });

  const passed = await done;

  driverSocket.disconnect();
  cadeteSocket.disconnect();
  invalidDriverSocket.disconnect();
  await prisma.$disconnect();

  console.log("[socket-test] state:", state);

  if (!passed) {
    throw new Error("Socket smoke test failed or timed out.");
  }

  console.log("[socket-test] PASS");
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[socket-test] FAIL", err.message);
    process.exit(1);
  });
