const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSlots() {
  // Ver todos los slots existentes
  const slots = await prisma.gCCallSlot.findMany({
    where: {
      status: { in: ['SCHEDULED', 'CONFIRMED'] }
    },
    include: {
      availability: { select: { gameChangerId: true } },
      participant: { select: { nombre: true } }
    },
    orderBy: [
      { scheduledDate: 'asc' },
      { scheduledTime: 'asc' }
    ]
  });
  
  console.log('=== SLOTS AGENDADOS ===');
  console.log('Total:', slots.length);
  
  // Agrupar por fecha y hora para detectar duplicados
  const byDateTimeGC = {};
  
  for (const slot of slots) {
    const dateStr = slot.scheduledDate.toISOString().split('T')[0];
    const key = `${dateStr}_${slot.scheduledTime}_GC${slot.availability.gameChangerId}`;
    
    if (!byDateTimeGC[key]) {
      byDateTimeGC[key] = [];
    }
    byDateTimeGC[key].push({
      id: slot.id,
      participant: slot.participant?.nombre,
      status: slot.status
    });
    
    console.log(`  ${dateStr} ${slot.scheduledTime} - GC${slot.availability.gameChangerId} - ${slot.participant?.nombre} (${slot.status})`);
  }
  
  // Buscar duplicados
  console.log('\n=== POSIBLES CONFLICTOS (misma hora/fecha/GC) ===');
  let hasConflicts = false;
  for (const [key, participants] of Object.entries(byDateTimeGC)) {
    if (participants.length > 1) {
      hasConflicts = true;
      console.log(`⚠️ CONFLICTO en ${key}:`);
      participants.forEach(p => console.log(`   - ${p.participant} (${p.status}) [id: ${p.id}]`));
    }
  }
  
  if (!hasConflicts) {
    console.log('✅ No hay conflictos de horarios');
  }
  
  await prisma.$disconnect();
}

checkSlots();
