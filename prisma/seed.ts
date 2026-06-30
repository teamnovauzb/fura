import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.SEED_EMAIL ?? "owner@fura.local").toLowerCase();
  const password = process.env.SEED_PASSWORD ?? "changeme123";
  const name = process.env.SEED_NAME ?? "Owner";

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: { role: "SUPERADMIN", active: true },
    create: { email, name, passwordHash, role: "SUPERADMIN" },
  });

  console.log(`✔ Superadmin ready: ${user.email}`);
  if (!process.env.SEED_PASSWORD) {
    console.log("  ⚠ Using default password 'changeme123' — change it after first login,");
    console.log("    or set SEED_PASSWORD before seeding in production.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
