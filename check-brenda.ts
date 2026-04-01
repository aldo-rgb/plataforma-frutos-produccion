import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.usuario.findFirst({
    where: { email: 'brendaecg78@gmail.com' },
    include: { 
      CartaFrutos: true 
    }
  });
  
  if (user) {
    console.log('Usuario ID:', user.id);
    console.log('Nombre:', user.nombre);
    if (user.CartaFrutos && user.CartaFrutos.length > 0) {
      const carta = user.CartaFrutos[0];
      console.log('\n=== CARTA DE FRUTOS ===');
      console.log('ID:', carta.id);
      console.log('Estado:', carta.estado);
      console.log('Wizard Step:', carta.wizardStep);
      console.log('Actualizada:', carta.fechaActualizacion);
      console.log('\n--- DECLARACIONES (SER) ---');
      console.log('Finanzas:', carta.finanzasDeclaracion);
      console.log('Relaciones:', carta.relacionesDeclaracion);
      console.log('Talentos:', carta.talentosDeclaracion);
      console.log('PazMental:', carta.pazMentalDeclaracion);
      console.log('Salud:', carta.saludDeclaracion);
      console.log('Ocio:', carta.ocioDeclaracion);
      console.log('\n--- METAS (OBJETIVOS) ---');
      console.log('finanzasMeta:', carta.finanzasMeta);
      console.log('relacionesMeta:', carta.relacionesMeta);
      console.log('talentosMeta:', carta.talentosMeta);
      console.log('pazMentalMeta:', carta.pazMentalMeta);
      console.log('saludMeta:', carta.saludMeta);
      console.log('ocioMeta:', carta.ocioMeta);
    } else {
      console.log('No tiene CartaFrutos');
    }
  } else {
    console.log('Usuario no encontrado');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
