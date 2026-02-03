const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function check() {
  const checkouts = await prisma.abandonedCheckout.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      email: true,
      firstName: true,
      status: true,
      checkoutStartedAt: true,
      emailSentAt: true,
      organizationId: true
    }
  });
  
  console.log("=== ÚLTIMOS 10 CHECKOUTS ABANDONADOS ===\n");
  for (const c of checkouts) {
    console.log("ID:", c.id);
    console.log("  Email:", c.email);
    console.log("  Nombre:", c.firstName);
    console.log("  Status:", c.status);
    console.log("  Checkout iniciado:", c.checkoutStartedAt);
    console.log("  Email enviado:", c.emailSentAt || "NO ENVIADO");
    console.log("");
  }
  
  // Verificar configuración de anticipos de la organización
  const org = await prisma.organization.findFirst({
    where: { id: 3 },
    select: { 
      name: true, 
      anticiposEnabled: true, 
      anticipoAmount: true,
      anticipoDeadlineHours: true
    }
  });
  
  console.log("=== CONFIGURACIÓN DE ANTICIPOS (Org 3) ===");
  console.log("Organización:", org?.name);
  console.log("Anticipos habilitados:", org?.anticiposEnabled);
  console.log("Monto anticipo:", org?.anticipoAmount?.toString());
  console.log("Deadline (horas):", org?.anticipoDeadlineHours);
  
  await prisma.$disconnect();
}
check();
