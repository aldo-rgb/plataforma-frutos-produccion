const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

const sampleLocations = [
  {
    name: "Sede Central",
    description: "Oficina principal - Centro de operaciones",
    latitude: 25.6866,
    longitude: -100.3161,
    radiusMeter: 50,
    address: "Av. Constitución 1234",
    city: "Monterrey",
    country: "México",
    imageUrl: null,
    isActive: true
  },
  {
    name: "Sede Norte",
    description: "Sucursal zona norte de la ciudad",
    latitude: 25.7617,
    longitude: -100.3031,
    radiusMeter: 75,
    address: "Blvd. Díaz Ordaz 5678",
    city: "San Pedro Garza García",
    country: "México",
    imageUrl: null,
    isActive: true
  },
  {
    name: "Sede San Nicolás",
    description: "Centro de actividades zona metropolitana",
    latitude: 25.7415,
    longitude: -100.2838,
    radiusMeter: 60,
    address: "Av. Universidad 9012",
    city: "San Nicolás de los Garza",
    country: "México",
    imageUrl: null,
    isActive: true
  },
  {
    name: "Sede Guadalupe",
    description: "Espacio de eventos y talleres",
    latitude: 25.6794,
    longitude: -100.2533,
    radiusMeter: 50,
    address: "Av. Eloy Cavazos 3456",
    city: "Guadalupe",
    country: "México",
    imageUrl: null,
    isActive: true
  },
  {
    name: "Sede Valle Oriente",
    description: "Centro comercial - Espacio para reuniones",
    latitude: 25.6520,
    longitude: -100.2907,
    radiusMeter: 100,
    address: "Av. Lázaro Cárdenas 7890",
    city: "San Pedro Garza García",
    country: "México",
    imageUrl: null,
    isActive: true
  }
];

async function main() {
  console.log('🌟 Iniciando seed de Quantum Locations...\n');

  // Limpiar locations existentes (opcional)
  const deleteCount = await prisma.location.count();
  if (deleteCount > 0) {
    console.log(`⚠️  Encontradas ${deleteCount} locations existentes.`);
    const response = 'yes'; // Cambiar a prompt si deseas confirmación manual
    
    if (response.toLowerCase() === 'yes') {
      await prisma.location.deleteMany({});
      console.log('✅ Locations anteriores eliminadas.\n');
    }
  }

  // Crear nuevas locations
  for (const locationData of sampleLocations) {
    const qrCodeHash = crypto.randomBytes(16).toString('hex');
    
    const location = await prisma.location.create({
      data: {
        ...locationData,
        qrCodeHash
      }
    });

    console.log(`✅ Creada: ${location.name}`);
    console.log(`   📍 Coordenadas: ${location.latitude}, ${location.longitude}`);
    console.log(`   🔑 QR Hash: ${location.qrCodeHash}`);
    console.log(`   📏 Radio: ${location.radiusMeter}m\n`);
  }

  const totalLocations = await prisma.location.count();
  console.log(`\n🎉 Seed completado! ${totalLocations} locations creadas.`);
  console.log('\n📝 Próximos pasos:');
  console.log('1. Accede al panel admin: /dashboard/admin/locations');
  console.log('2. Genera y descarga los códigos QR');
  console.log('3. Imprime y coloca los códigos en las ubicaciones físicas');
  console.log('4. Los usuarios podrán escanear para hacer check-in\n');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
