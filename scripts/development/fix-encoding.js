const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  
  try {
    // Buscar todos los usuarios con problemas de encoding
    const allUsers = await prisma.$queryRaw`
      SELECT id, nombre FROM "Usuario" 
      WHERE nombre LIKE '%�%'
      ORDER BY id ASC
    `;
    
    console.log(`Encontrados ${allUsers.length} usuarios con problemas de encoding\n`);
    
    // Mapa de reemplazos comunes
    const replacements = {
      '�': 'á', // Most common for accented a
      'Jes�s': 'Jesús',
      'Jos�': 'José',
      'Mar�a': 'María',
      'Gonz�lez': 'González',
      'Rodr�guez': 'Rodríguez',
      'P�rez': 'Pérez',
      'G�mez': 'Gómez',
      'Garc�a': 'García',
      'Hern�ndez': 'Hernández',
      'Ram�rez': 'Ramírez',
      'S�nchez': 'Sánchez',
      'L�pez': 'López',
      'Mart�nez': 'Martínez',
      'Jim�nez': 'Jiménez',
      'D�az': 'Díaz',
      'V�zquez': 'Vázquez',
      'Mu�oz': 'Muñoz',
      'Mu�iz': 'Muñiz',
      'N��ez': 'Núñez',
      'Nu�ez': 'Núñez',
      'Pe�a': 'Peña',
      'Monta�o': 'Montaño',
      'Casta�on': 'Castañon',
      'Trevi�o': 'Treviño',
      'G�lvez': 'Gálvez',
      'Le�n': 'León',
      'Lic�n': 'Licón',
      'Raz�n': 'Razón',
      'Guzm�n': 'Guzmán',
      'Mar�n': 'Marín',
      'Iv�n': 'Iván',
      'Adri�n': 'Adrián',
      'C�sar': 'César',
      'H�ctor': 'Héctor',
      'Ren�': 'René',
      'Ang�lica': 'Angélica',
      'Am�rica': 'América',
      'Ascenci�n': 'Ascensión',
      'D�ana': 'Diana',
      'Galv�n': 'Galván',
      '�vila': 'Ávila',
      '�lvarez': 'Álvarez',
      'Ambr�z': 'Ambríz',
      'Dom�nguez': 'Domínguez',
      'Ram�ro': 'Ramiro',
      'D�vila': 'Dávila',
    };
    
    let fixedCount = 0;
    
    for (const user of allUsers) {
      let newName = user.nombre;
      
      // Apply all replacements
      for (const [bad, good] of Object.entries(replacements)) {
        if (newName.includes(bad)) {
          newName = newName.split(bad).join(good);
        }
      }
      
      // If still has issues, try generic replacement
      newName = newName
        .replace(/�a/g, 'á')
        .replace(/�e/g, 'é')
        .replace(/�i/g, 'í')
        .replace(/�o/g, 'ó')
        .replace(/�u/g, 'ú')
        .replace(/�n/g, 'ñ')
        .replace(/�/g, 'í'); // Fallback for remaining
      
      if (newName !== user.nombre) {
        console.log(`ID ${user.id}: "${user.nombre}" → "${newName}"`);
        
        await prisma.$executeRaw`
          UPDATE "Usuario" 
          SET nombre = ${newName}
          WHERE id = ${user.id}
        `;
        fixedCount++;
      }
    }
    
    console.log(`\n✅ Corregidos ${fixedCount} usuarios`);
    
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
