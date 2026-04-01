import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Buscar a Brenda Elizabeth
  const brenda = await prisma.usuario.findFirst({
    where: { nombre: { contains: 'Brenda Elizabeth' } },
    select: { id: true, nombre: true, email: true }
  });
  
  if (!brenda) {
    console.log('Usuario no encontrado');
    return;
  }
  
  console.log('Usuario:', brenda.nombre, '(ID:', brenda.id, ')');
  console.log('Email:', brenda.email);
  
  // Buscar su carta
  const carta = await prisma.cartaFrutos.findFirst({
    where: { usuarioId: brenda.id },
    select: {
      id: true,
      estado: true,
      finanzasSer: true,
      finanzasDeclaracion: true,
      relacionesSer: true,
      relacionesDeclaracion: true,
      talentosSer: true,
      talentosDeclaracion: true,
      saludSer: true,
      saludDeclaracion: true,
      pazMentalSer: true,
      pazMentalDeclaracion: true,
      ocioSer: true,
      ocioDeclaracion: true,
      updatedAt: true
    }
  });
  
  if (!carta) {
    console.log('\n❌ No tiene carta creada');
    return;
  }
  
  console.log('\n=== CARTA DE OBJETIVOS ===');
  console.log('ID:', carta.id);
  console.log('Estado:', carta.estado);
  console.log('Última actualización:', carta.updatedAt);
  
  console.log('\n=== DECLARACIONES DEL SER ===');
  console.log('Finanzas:', carta.finanzasSer || '(vacío)');
  console.log('Relaciones:', carta.relacionesSer || '(vacío)');
  console.log('Talentos:', carta.talentosSer || '(vacío)');
  console.log('Salud:', carta.saludSer || '(vacío)');
  console.log('Paz Mental:', carta.pazMentalSer || '(vacío)');
  console.log('Ocio:', carta.ocioSer || '(vacío)');
  
  console.log('\n=== OBJETIVOS ===');
  console.log('Finanzas:', carta.finanzasDeclaracion || '(vacío)');
  console.log('Relaciones:', carta.relacionesDeclaracion || '(vacío)');
  console.log('Talentos:', carta.talentosDeclaracion || '(vacío)');
  console.log('Salud:', carta.saludDeclaracion || '(vacío)');
  console.log('Paz Mental:', carta.pazMentalDeclaracion || '(vacío)');
  console.log('Ocio:', carta.ocioDeclaracion || '(vacío)');
}

main().catch(console.error).finally(() => prisma.$disconnect());
