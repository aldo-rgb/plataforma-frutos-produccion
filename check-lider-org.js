const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLiderOrganization() {
  try {
    // Buscar el usuario "mentor wer"
    const lider = await prisma.usuario.findFirst({
      where: {
        nombre: {
          contains: 'mentor wer',
          mode: 'insensitive'
        }
      },
      include: {
        Organization: {
          select: {
            id: true,
            name: true,
            schoolAdminId: true
          }
        },
        PerfilMentor: {
          select: {
            id: true,
            biografia: true,
            tituloProfesional: true,
            tituloMentor: true,
            profileApprovalStatus: true
          }
        }
      }
    });

    if (!lider) {
      console.log('❌ No se encontró el usuario "mentor wer"');
      return;
    }

    console.log('\n✅ Usuario encontrado:');
    console.log('ID:', lider.id);
    console.log('Nombre:', lider.nombre);
    console.log('Email:', lider.email);
    console.log('Rol:', lider.rol);
    console.log('Organization ID:', lider.organizationId);
    
    console.log('\n📋 Organización:');
    if (lider.Organization) {
      console.log('Nombre:', lider.Organization.name);
      console.log('School Admin ID:', lider.Organization.schoolAdminId);
      
      if (lider.Organization.schoolAdminId) {
        const director = await prisma.usuario.findUnique({
          where: { id: lider.Organization.schoolAdminId },
          select: {
            id: true,
            nombre: true,
            email: true,
            rol: true
          }
        });
        
        console.log('\n👤 Director de la organización:');
        if (director) {
          console.log('ID:', director.id);
          console.log('Nombre:', director.nombre);
          console.log('Email:', director.email);
          console.log('Rol:', director.rol);
        } else {
          console.log('❌ El schoolAdminId existe pero no se encontró el usuario director');
        }
      } else {
        console.log('⚠️ La organización NO TIENE schoolAdminId asignado');
      }
    } else {
      console.log('❌ El líder NO TIENE organización asignada');
    }
    
    console.log('\n📄 Perfil de Mentor:');
    if (lider.PerfilMentor) {
      console.log('Tiene biografía:', lider.PerfilMentor.biografia ? `Sí (${lider.PerfilMentor.biografia.length} caracteres)` : 'No');
      console.log('Título Profesional:', lider.PerfilMentor.tituloProfesional || 'No definido');
      console.log('Título de Mentor:', lider.PerfilMentor.tituloMentor || 'No definido');
      console.log('Estado de aprobación:', lider.PerfilMentor.profileApprovalStatus || 'No definido');
    } else {
      console.log('❌ El líder NO TIENE PerfilMentor');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkLiderOrganization();
