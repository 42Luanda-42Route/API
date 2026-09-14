import { PrismaClient } from "@prisma/client";
import { faker } from "@faker-js/faker";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = "12345678";

const ROUTE_SEEDS = [
  { route_name: "Mutamba - Cazenga", description: "Linha principal centro-cidade." },
  { route_name: "Ingombota - Viana", description: "Liga zona urbana a Viana." },
  { route_name: "Maianga - Benfica", description: "Fluxo residencial e comercial." },
  { route_name: "Kilamba - Largo", description: "Ligacao periurbana." },
];

// Coordenadas em Luanda
function generateLuandaCoordinates() {
  return {
    latitude: faker.number.float({ min: -9.0, max: -8.6 }),
    longitude: faker.number.float({ min: 13.0, max: 13.5 }),
  };
}

async function cleanDatabase() {
  await prisma.message.deleteMany();
  await prisma.chat.deleteMany();
  await prisma.boardingRequest.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.driverCoordinates.deleteMany();
  await prisma.cadetes.deleteMany();
  await prisma.drivers.deleteMany();
  await prisma.miniBusStop.deleteMany();
  await prisma.route.deleteMany();
  await prisma.admins.deleteMany();
}

async function seedAdmins(passwordHash: string) {
  return prisma.admins.createMany({
    data: [
      {
        full_name: "Admin Geral",
        username: "admin",
        email: "admin@42route.com",
        password: passwordHash,
      },
      {
        full_name: "Gestor Operacional",
        username: "ops_admin",
        email: "ops@42route.com",
        password: passwordHash,
      },
    ],
  });
}

async function seedRoutes() {
  const createdRoutes = [] as Array<{ id: number; route_name: string }>;

  for (const route of ROUTE_SEEDS) {
    const created = await prisma.route.create({ data: route });
    createdRoutes.push({ id: created.id, route_name: created.route_name });
  }

  return createdRoutes;
}

async function seedStops(routes: Array<{ id: number; route_name: string }>) {
  const createdStops = [] as Array<{ id: number; route_id: number }>;

  for (const route of routes) {
    for (let i = 1; i <= 4; i++) {
      const coords = generateLuandaCoordinates();
      const stop = await prisma.miniBusStop.create({
        data: {
          stop_name: `${route.route_name} - Paragem ${i}`,
          district: faker.helpers.arrayElement([
            "Maianga",
            "Ingombota",
            "Samba",
            "Talatona",
            "Viana",
            "Cazenga",
          ]),
          latitude: coords.latitude,
          longitude: coords.longitude,
          description: `Paragem ${i} da rota ${route.route_name}`,
          route_id: route.id,
        },
      });

      createdStops.push({ id: stop.id, route_id: stop.route_id });
    }
  }

  return createdStops;
}

async function seedDrivers(
  routes: Array<{ id: number; route_name: string }>,
  passwordHash: string
) {
  const createdDrivers = [] as Array<{ id: number; current_route_id: number | null }>;

  for (let i = 0; i < routes.length; i++) {
    const route = routes[i];
    const driver = await prisma.drivers.create({
      data: {
        full_name: faker.person.fullName(),
        username: `driver_${i + 1}`,
        email: `driver_${i + 1}@42route.com`,
        password: passwordHash,
        phone: faker.number.int({ min: 900000000, max: 999999999 }),
        photo: `https://api.dicebear.com/9.x/identicon/svg?seed=driver_${i + 1}`,
        current_route_id: route.id,
      },
    });

    createdDrivers.push({ id: driver.id, current_route_id: driver.current_route_id });
  }

  return createdDrivers;
}

async function seedDriverCoordinates(drivers: Array<{ id: number }>) {
  for (const driver of drivers) {
    const coords = generateLuandaCoordinates();
    await prisma.driverCoordinates.create({
      data: {
        id_driver: driver.id,
        lat: coords.latitude,
        long: coords.longitude,
      },
    });
  }
}

async function seedCadetes(stops: Array<{ id: number }>) {
  for (let i = 0; i < 24; i++) {
    const stop = stops[i % stops.length];
    await prisma.cadetes.create({
      data: {
        full_name: faker.person.fullName(),
        username: `cadete_${i + 1}`,
        email: `cadete_${i + 1}@student.42luanda.ao`,
        city: "Luanda",
        district: faker.helpers.arrayElement([
          "Maianga",
          "Ingombota",
          "Samba",
          "Talatona",
          "Viana",
          "Cazenga",
        ]),
        phone: faker.number.int({ min: 900000000, max: 999999999 }),
        priorityList: i % 5 === 0,
        stop_id: stop.id,
      },
    });
  }

  return prisma.cadetes.findMany({
    select: {
      id: true,
      stop_id: true,
    },
  });
}

async function seedChatsAndMessages(
  routes: Array<{ id: number }>,
  drivers: Array<{ id: number; current_route_id: number | null }>,
  cadetes: Array<{ id: number; stop_id: number | null }>
) {
  const generalChat = await prisma.chat.create({
    data: {
      full_name: "Canal Geral 42Route",
      type: "GENERAL",
      route_id: null,
    },
  });

  for (const route of routes) {
    await prisma.chat.create({
      data: {
        full_name: `Canal da Rota ${route.id}`,
        type: "ROUTE",
        route_id: route.id,
      },
    });
  }

  const routeChats = await prisma.chat.findMany({ where: { type: "ROUTE" } });

  const firstDriver = drivers[0];
  const firstCadete = cadetes[0];

  if (firstDriver && firstCadete) {
    await prisma.message.createMany({
      data: [
        {
          chat_id: generalChat.id,
          sender_id: firstDriver.id,
          senderType: "DRIVER",
          content: "Bem-vindos ao canal geral do 42Route.",
        },
        {
          chat_id: generalChat.id,
          sender_id: firstCadete.id,
          senderType: "CADETE",
          content: "Obrigado. Sistema de rotas operacional.",
        },
      ],
    });
  }

  for (const routeChat of routeChats) {
    const driver = drivers.find((d) => d.current_route_id === routeChat.route_id);
    const cadete = cadetes.find((c) => c.stop_id !== null);

    if (!driver || !cadete) continue;

    await prisma.message.createMany({
      data: [
        {
          chat_id: routeChat.id,
          sender_id: driver.id,
          senderType: "DRIVER",
          content: `Motorista ativo na rota ${routeChat.route_id}.`,
        },
        {
          chat_id: routeChat.id,
          sender_id: cadete.id,
          senderType: "CADETE",
          content: `Cadete aguardando transporte na rota ${routeChat.route_id}.`,
        },
      ],
    });
  }
}

async function main() {
  console.log("🌱 Seeding database...");
  faker.seed(42042);

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  await cleanDatabase();
  await seedAdmins(passwordHash);

  const routes = await seedRoutes();
  const stops = await seedStops(routes);
  const drivers = await seedDrivers(routes, passwordHash);

  await seedDriverCoordinates(drivers);

  const cadetes = await seedCadetes(stops);
  await seedChatsAndMessages(routes, drivers, cadetes);

  console.log("✅ Seed concluido com sucesso!");
  console.log(`Admins: 2`);
  console.log(`Routes: ${routes.length}`);
  console.log(`Stops: ${stops.length}`);
  console.log(`Drivers: ${drivers.length}`);
  console.log(`Cadetes: ${cadetes.length}`);
}

main()
  .catch(err => {
    console.error("❌ Erro no seed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
