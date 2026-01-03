const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Creando tabla InstitutionalOrder...');
  
  try {
    // Crear tabla
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "InstitutionalOrder" (
        "id" SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL,
        "nombreOrganizacion" TEXT NOT NULL,
        "emailCoordinador" TEXT NOT NULL,
        "logoUrl" TEXT,
        "geofencing" TEXT,
        "cantidadLicencias" INTEGER NOT NULL,
        "totalAmount" DOUBLE PRECISION NOT NULL,
        "paymentMethod" TEXT NOT NULL,
        "paymentSessionId" TEXT,
        "paymentId" TEXT,
        "status" TEXT NOT NULL DEFAULT 'PENDING',
        "organizationId" INTEGER,
        "processedAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "InstitutionalOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "InstitutionalOrder_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE
      )
    `);
    console.log('✅ Tabla creada');
    
    // Crear índices
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "InstitutionalOrder_userId_idx" ON "InstitutionalOrder"("userId")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "InstitutionalOrder_status_idx" ON "InstitutionalOrder"("status")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "InstitutionalOrder_organizationId_idx" ON "InstitutionalOrder"("organizationId")`);
    console.log('✅ Índices creados');
    
    console.log('✅ Todo completado exitosamente');
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
