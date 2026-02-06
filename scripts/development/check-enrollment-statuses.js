const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const statuses = await prisma.$queryRaw`
    SELECT DISTINCT "enrollmentStatus", "attendanceStatus" 
    FROM vision_enrollments
  `;
  console.log('Statuses found:', statuses);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
