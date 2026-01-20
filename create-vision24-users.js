const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

const users = [
  { nombre: 'RocioSolis Facundo', telefono: '8115452940', email: 'r.facundo8373@gmail.com', angel: 'Juany Guadalupe Valdez Solis', visionAngel: 10 },
  { nombre: 'José juan Cortés Garza', telefono: '8125139254', email: 'jose.jcg2002@gmail.com', angel: 'Carlos Fidencio Castro Amaya', visionAngel: 18 },
  { nombre: 'Sergio Guzman Guerrero', telefono: '8118323127', email: 'segiguerrero@gmail.com', angel: 'Carlos Fidencio Castro Amaya', visionAngel: 18 },
  { nombre: 'Zaira Guadalupe Alcala', telefono: '8113490098', email: 'zairaalcalaramos@gmail.com', angel: 'Sanjuana Lidia García Guzman', visionAngel: 16 },
  { nombre: 'Fernanda rodriguez Perez', telefono: '8117086685', email: 'fer.rp.0105@gmail.com', angel: 'Berenice Cecilia Perez Ortiz', visionAngel: 22 },
  { nombre: 'Erika Patricia Gonzalez Ortega', telefono: '8127401063', email: 'egonzalezortega60@gmail.com', angel: 'Alejandra Sanchez Reyes', visionAngel: 21 },
  { nombre: 'Linda Nayeli Valdes Gonzalez', telefono: '8141311168', email: 'lindavaldes240@gmail.com', angel: 'Alejandra Sanchez Reyes', visionAngel: 21 },
  { nombre: 'Lizeth De Anda Calderon', telefono: '8119497698', email: 'lizethdeandac@gmail.com', angel: 'Yolanda Beatriz Ramirez Banda', visionAngel: 21 },
  { nombre: 'Perla Yareli Gaytan Nieves', telefono: '8180787095', email: 'perlanieves79@icloud.com', angel: 'Rosalba Gonzalez', visionAngel: 22 },
  { nombre: 'María Josefina Sanchez Marin', telefono: '4491055704', email: 'josefinasama1@gmail.com', angel: 'Karla Yuselin Salas Rodriguez', visionAngel: 22 },
  { nombre: 'Oralia Arriaga Dominguez', telefono: '8117862236', email: 'arriaga.oralia@gmail.com', angel: 'Karla Yuselin Salas Rodriguez', visionAngel: 22 },
  { nombre: 'Miriam Nayeli Rodriguez', telefono: '8118437990', email: 'miry_rodriguezhdz@hotmail.com', angel: 'Karla Yuselin Salas Rodriguez', visionAngel: 22 },
  { nombre: 'Guillermo Enrique Cardenas Amador', telefono: '8113660892', email: 'guillermo.enrique99@outlook.com', angel: 'Victor Amador', visionAngel: 22 },
  { nombre: 'Jorge Alberto Diaz Espinosa', telefono: '8117295419', email: 'diaz.espinosa.7@gmail.com', angel: 'Hilda Clara Moreno Escobedo', visionAngel: 14 },
  { nombre: 'Juan Arevalo Almaguer', telefono: '8140316889', email: 'juanarevalo92@gmail.com', angel: 'Carlos Fidencio Castro Amaya', visionAngel: 18 },
  { nombre: 'Arturo Cortez Castillo', telefono: '8126459254', email: 'arturocortezcastillo1@gmail.com', angel: 'Santos Pablo Garza Treviño', visionAngel: 18 },
  { nombre: 'María Angela Hernandez', telefono: '8131078988', email: 'mariaangelahdzreyna@gmail.com', angel: 'Hilda Clara Moreno Escobedo', visionAngel: 14 },
  { nombre: 'Violeta Colunga Sanchez', telefono: '8129785754', email: 'violetacolunga2011@hotmail.com', angel: 'Adriana Elizabeth Rodriguez Torres', visionAngel: 15 },
  { nombre: 'Diana Lucia Campos Barrera', telefono: '8444850461', email: 'diana_95cb@hotmail.com', angel: 'Adriana Elizabeth Rodriguez Torres', visionAngel: 15 },
  { nombre: 'Jorge Adan Gonzalez Garcia', telefono: '8444506779', email: 'jorgead1604@gmail.com', angel: 'Adriana Elizabeth Rodriguez Torres', visionAngel: 15 },
  { nombre: 'Julio Alanis Garcia', telefono: '8444012855', email: 'julio.alanis@hotmail.com', angel: 'Adriana Elizabeth Rodriguez Torres', visionAngel: 15 },
  { nombre: 'Dulce Selene Cruz Lopez', telefono: '8444074478', email: 'cruzlopez31@icloud.com', angel: 'Adriana Elizabeth Rodriguez Torres', visionAngel: 15 },
  { nombre: 'Rosa Selene Flores Marquez', telefono: '8443459020', email: 'atencionvyt@yahoo.com.mx', angel: 'Adriana Elizabeth Rodriguez Torres', visionAngel: 15 },
  { nombre: 'Raquel Briones Chairez', telefono: '8441350802', email: 'raquel.briones@hotmail.com', angel: 'Adriana Elizabeth Rodriguez Torres', visionAngel: 15 },
  { nombre: 'Maria Lidia Tovar', telefono: '8442591929', email: 'toyomaria660@gmail.com', angel: 'Adriana Elizabeth Rodriguez Torres', visionAngel: 15 },
  { nombre: 'Inocencia Gonzalez Espino', telefono: '8444095217', email: 'espinoinocencia@yahoo.com.mx', angel: 'Adriana Elizabeth Rodriguez Torres', visionAngel: 15 },
  { nombre: 'Beatriz Adriana Colunga Sanchez', telefono: '8444107795', email: 'colungadri@hotmail.com', angel: 'Adriana Elizabeth Rodriguez Torres', visionAngel: 15 },
  { nombre: 'Miriam Judith Tovar Moreno', telefono: '8442598814', email: 'mitovar84@gmail.com', angel: 'Adriana Elizabeth Rodriguez Torres', visionAngel: 15 },
  { nombre: 'Dora Isela Martinez Moreno', telefono: '8443148912', email: 'dora-martinez@live.com', angel: 'Adriana Elizabeth Rodriguez Torres', visionAngel: 15 },
  { nombre: 'Guadalupe del Carmen Cardenas Cuellar', telefono: '8444159403', email: 'lupytacardenasc@yahoo.com.mx', angel: 'Adriana Elizabeth Rodriguez Torres', visionAngel: 15 }
];

const VISION_ID = 5;
const ORG_ID = 3;
const PASSWORD = 'ImpactoCuantico2025';
const PRICE = 6500;

async function main() {
  const hashedPassword = await bcrypt.hash(PASSWORD, 10);
  let created = 0, failed = 0;
  const createdUsers = [];
  
  for (const u of users) {
    try {
      // Verificar si ya existe
      const existing = await prisma.usuario.findFirst({
        where: { OR: [{ email: u.email }, { telefono: u.telefono }] }
      });
      
      if (existing) {
        console.log('⚠️ Ya existe: ' + u.nombre + ' (' + u.email + ')');
        failed++;
        continue;
      }
      
      // Crear usuario
      const user = await prisma.usuario.create({
        data: {
          nombre: u.nombre,
          email: u.email,
          telefono: u.telefono,
          password: hashedPassword,
          organizationId: ORG_ID,
          isActive: true,
          requirePasswordChange: true,
          angelEnrrolamiento: u.angel,
          visionAngel: u.visionAngel.toString(),
          currentVisionLevel: 'BASIC',
          studentStatus: 'BASIC_STUDENT'
        }
      });
      
      // Crear enrollment
      await prisma.vision_enrollment.create({
        data: {
          userId: user.id,
          visionId: VISION_ID,
          level: 'BASIC',
          enrollmentStatus: 'ENROLLED'
        }
      });
      
      // Crear ticket
      await prisma.ticket.create({
        data: {
          ownerId: user.id,
          organizationId: ORG_ID,
          visionId: VISION_ID,
          level: 'BASIC',
          status: 'ACTIVE',
          paymentStatus: 'PAID',
          purchasePrice: PRICE
        }
      });
      
      console.log('✅ ' + u.nombre + ' (ID: ' + user.id + ')');
      createdUsers.push({ id: user.id, nombre: u.nombre, email: u.email, telefono: u.telefono });
      created++;
    } catch (error) {
      console.log('❌ Error ' + u.nombre + ': ' + error.message);
      failed++;
    }
  }
  
  console.log('\n=== RESUMEN ===');
  console.log('Creados: ' + created);
  console.log('Fallidos: ' + failed);
  
  if (createdUsers.length > 0) {
    console.log('\n=== USUARIOS CREADOS ===');
    createdUsers.forEach((u, i) => {
      console.log((i + 1) + '. ID: ' + u.id + ' | ' + u.nombre + ' | ' + u.email + ' | ' + u.telefono);
    });
  }
  
  await prisma.$disconnect();
}

main();
