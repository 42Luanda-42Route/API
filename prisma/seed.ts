import { PrismaClient } from "@prisma/client";
import { faker } from "@faker-js/faker";

const prisma = new PrismaClient();

// Coordenadas em Luanda
function generateLuandaCoordinates() {
  return {
    latitude: faker.number.float({ min: -9.0, max: -8.6 }),
    longitude: faker.number.float({ min: 13.0, max: 13.5 }),
  };
}

async function main() {
  console.log("🌱 Seeding database...");

  /* =========================
     LIMPEZA (ordem correta)
  ========================= */

  await prisma.message.deleteMany();
  await prisma.chat.deleteMany();
  await prisma.driverCoordinates.deleteMany();
  await prisma.cadetes.deleteMany();
  await prisma.drivers.deleteMany();
  await prisma.miniBusStop.deleteMany();
  await prisma.route.deleteMany();
  await prisma.admins.deleteMany();

  /* =========================
     ADMIN
  ========================= */

  await prisma.admins.create({
    data: {
      full_name: "Admin Geral",
      username: "admin",
      email: "admin@email.com",
      passwrd: "123456",
    },
  });

  /* =========================
     ROTAS (4)
  ========================= */

  const routes = await Promise.all(
    Array.from({ length: 4 }).map(() =>
      prisma.route.create({
        data: {
          route_name: faker.location.street(),
          description: faker.lorem.sentence(),
        },
      })
    )
  );

  /* =========================
     PARAGENS (20)
     Cada paragem pertence a UMA rota
  ========================= */

  const stops = await Promise.all(
    Array.from({ length: 20 }).map(() => {
      const coords = generateLuandaCoordinates();
      const route = faker.helpers.arrayElement(routes);

      return prisma.miniBusStop.create({
        data: {
          stop_name: faker.location.street(),
          distrit: faker.location.city(),
          latitude: coords.latitude,
          longitude: coords.longitude,
          route_id: route.id,
        },
      });
    })
  );

  /* =========================
     MOTORISTAS (3)
  ========================= */

  const drivers = await Promise.all(
    Array.from({ length: 3 }).map(() => {
      const route = faker.helpers.arrayElement(routes);

      return prisma.drivers.create({
        data: {
          full_name: faker.person.fullName(),
          username: faker.internet.username(),
          email: faker.internet.email(),
          passwrd: "123456",
          phone: faker.number.int({ min: 900000000, max: 999999999 }),
          current_route_id: route.id,
        },
      });
    })
  );

  /* =========================
     COORDENADAS DOS MOTORISTAS
  ========================= */

  await Promise.all(
    drivers.map(driver => {
      const coords = generateLuandaCoordinates();

      return prisma.driverCoordinates.create({
        data: {
          lat: coords.latitude,
          long: coords.longitude,
          id_driver: driver.id,
        },
      });
    })
  );

  /* =========================
     CADETES (50)
     Cadete → Paragem → Rota
  ========================= */

  await Promise.all(
    Array.from({ length: 50 }).map(() => {
      const stop = faker.helpers.arrayElement(stops);

      return prisma.cadetes.create({
        data: {
          full_name: faker.person.fullName(),
          username: faker.internet.username(),
          email: faker.internet.email(),
          city: faker.location.city(),
          distrit: faker.location.city(),
          phone: faker.number.int({ min: 900000000, max: 999999999 }),
          passwrd: "123456",
          stop_id: stop.id,
        },
      });
    })
  );

  console.log("✅ Seed concluído com sucesso!");
}

main()
  .catch(err => {
    console.error("❌ Erro no seed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
