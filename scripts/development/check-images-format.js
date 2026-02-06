const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkImageFormat() {
  try {
    const user = await prisma.usuario.findFirst({
      where: {
        nombre: { contains: 'Iri' }
      },
      select: {
        id: true,
        nombre: true,
        profileImage: true
      }
    })

    if (user) {
      console.log('Usuario:', user.nombre)
      console.log('ID:', user.id)
      if (user.profileImage) {
        console.log('Longitud profileImage:', user.profileImage.length)
        console.log('Primeros 100 caracteres:', user.profileImage.substring(0, 100))
        console.log('Empieza con data:?', user.profileImage.startsWith('data:'))
        console.log('Empieza con http?', user.profileImage.startsWith('http'))
      } else {
        console.log('No tiene profileImage')
      }
    } else {
      console.log('Usuario no encontrado')
    }
  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

checkImageFormat()
