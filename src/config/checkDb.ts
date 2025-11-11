import { prisma } from "./database.js";


async function main() {
  const result = await prisma.$queryRaw`SELECT DB_NAME() AS CurrentDB`;
  console.log(result);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
