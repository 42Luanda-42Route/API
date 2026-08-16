import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("\n🌱 Seeding Admin user in PostgreSQL database...");

  const adminCredentials = [
    {
      full_name: "Admin Geral",
      username: "admin",
      email: "admin@42route.com",
      password: "Admin@2026",
    },
    {
      full_name: "Admin Suporte",
      username: "admin42",
      email: "suporte@42luanda.ao",
      password: "senha123",
    },
  ];

  for (const admin of adminCredentials) {
    const hashedPassword = await bcrypt.hash(admin.password, 10);

    const existing = await prisma.admins.findFirst({
      where: {
        OR: [{ username: admin.username }, { email: admin.email }],
      },
    });

    if (existing) {
      const updated = await prisma.admins.update({
        where: { id: existing.id },
        data: {
          full_name: admin.full_name,
          username: admin.username,
          email: admin.email,
          password: hashedPassword,
        },
      });
      console.log(`✓ Admin atualizado: @${updated.username} (${admin.email}) com senha: '${admin.password}'`);
    } else {
      const created = await prisma.admins.create({
        data: {
          full_name: admin.full_name,
          username: admin.username,
          email: admin.email,
          password: hashedPassword,
        },
      });
      console.log(`✓ Admin criado: @${created.username} (${admin.email}) com senha: '${admin.password}'`);
    }
  }

  console.log("\n✅ Admin seed concluído com sucesso!\n");
}

main()
  .catch((err) => {
    console.error("❌ Erro ao criar admin:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
