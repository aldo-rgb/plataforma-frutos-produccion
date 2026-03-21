const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Obtener el formulario médico existente de Diana (visionId: 5)
  const existingForm = await prisma.medicalForm.findFirst({
    where: { userId: 116 }
  });
  
  if (!existingForm) {
    console.log('No se encontró formulario médico existente');
    return;
  }
  
  console.log('Formulario existente encontrado:', existingForm.id, 'visionId:', existingForm.visionId);
  
  // Verificar si ya apunta a Vision 25
  if (existingForm.visionId === 6) {
    console.log('El formulario ya apunta a Vision 25');
    return;
  }
  
  // Actualizar el formulario para que apunte a Vision 25 (visionId: 6)
  const updatedForm = await prisma.medicalForm.update({
    where: { id: existingForm.id },
    data: {
      visionId: 6, // Vision 25
      updatedAt: new Date()
    }
  });
  
  console.log('✅ Formulario médico actualizado a Vision 25. ID:', updatedForm.id);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
