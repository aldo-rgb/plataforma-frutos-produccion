import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

export default async function HomePage() {
  // Obtener el host del request
  const headersList = await headers();
  const host = headersList.get('host') || '';
  
  // Limpiar el dominio (quitar www, puerto, etc.)
  const cleanDomain = host
    .replace(/^www\./, '')
    .replace(/:\d+$/, '')
    .toLowerCase();
  
  // Verificar si es un dominio personalizado de alguna organización
  // Excluir dominios conocidos del sistema
  const systemDomains = ['localhost', 'vercel.app', 'appsync.mx', 'www.appsync.mx'];
  const isSystemDomain = systemDomains.some(d => cleanDomain.includes(d));
  
  if (!isSystemDomain) {
    // Buscar organización con este dominio personalizado
    const organization = await prisma.organization.findFirst({
      where: {
        customDomain: cleanDomain,
        status: 'ACTIVE'
      },
      select: {
        slug: true
      }
    });
    
    if (organization) {
      // Redirigir a la landing page de la organización
      redirect(`/org/${organization.slug}`);
    }
  }
  
  // Si no es dominio personalizado o no se encontró, ir al login
  redirect('/login');
}
