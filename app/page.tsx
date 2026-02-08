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
  
  // Mapeo de dominios personalizados conocidos (sin consultar DB)
  const knownDomains: Record<string, string> = {
    'impactocuantico.net': '/org/impacto-cu-ntico-monterrey',
  };
  
  // Si es un dominio conocido, redirigir directamente
  if (knownDomains[cleanDomain]) {
    redirect(knownDomains[cleanDomain]);
  }
  
  // Verificar si es un dominio del sistema
  const systemDomains = ['localhost', 'vercel.app', 'appsync.mx', 'quantummatter.app'];
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
