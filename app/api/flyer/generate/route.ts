import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generarFlyerBasico } from '@/lib/flyer-generator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const preview = searchParams.get('preview') === 'true';
  const orgId = searchParams.get('org');
  
  let flyerData = {
    orgName: 'IMPACTO CUÁNTICO',
    visionName: 'VISIÓN 25',
    visionCity: 'MONTERREY',
    fechaTexto: '20 - 22 De Febrero',
    diasTexto: 'VIERNES A DOMINGO',
    headline: 'ROMPE TUS LÍMITES MENTALES Y TRANSFORMA TUS RESULTADOS EN 3 DÍAS.',
    ubicacionTexto: '',
    telefono: '',
    backgroundUrl: '',
    showUrgencyBadge: true,
    urgencyText: '¡CUPO LIMITADO!'
  };
  
  try {
    if (orgId) {
      const organization = await prisma.organization.findUnique({
        where: { id: parseInt(orgId) },
        select: {
          name: true,
          flyerBackgroundUrl: true,
          flyerHeadline: true,
          flyerLocationDetail: true,
          flyerShowUrgencyBadge: true,
          flyerUrgencyText: true,
          flyerWhatsappNumber: true,
        }
      });
      
      if (organization) {
        flyerData.orgName = organization.name || flyerData.orgName;
        flyerData.backgroundUrl = organization.flyerBackgroundUrl || '';
        flyerData.headline = organization.flyerHeadline || flyerData.headline;
        flyerData.ubicacionTexto = organization.flyerLocationDetail || '';
        flyerData.showUrgencyBadge = organization.flyerShowUrgencyBadge ?? true;
        flyerData.urgencyText = organization.flyerUrgencyText || flyerData.urgencyText;
        flyerData.telefono = organization.flyerWhatsappNumber || '';
      }
      
      // Obtener próxima visión
      const nextVision = await prisma.vision.findFirst({
        where: {
          organizationId: parseInt(orgId),
          isActive: true,
          startDate: { gte: new Date() }
        },
        orderBy: { startDate: 'asc' },
        select: {
          nombre: true,
          startDate: true,
          endDate: true,
          lugar: true,
        }
      });
      
      if (nextVision) {
        flyerData.visionName = nextVision.nombre || flyerData.visionName;
        flyerData.visionCity = nextVision.lugar || flyerData.visionCity;
        
        if (nextVision.startDate) {
          const start = new Date(nextVision.startDate);
          const end = nextVision.endDate ? new Date(nextVision.endDate) : null;
          
          const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                         'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
          const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
          
          if (end) {
            flyerData.fechaTexto = `${start.getDate()} - ${end.getDate()} De ${months[start.getMonth()]}`;
            flyerData.diasTexto = `${days[start.getDay()].toUpperCase()} A ${days[end.getDay()].toUpperCase()}`;
          } else {
            flyerData.fechaTexto = `${start.getDate()} De ${months[start.getMonth()]}`;
            flyerData.diasTexto = days[start.getDay()].toUpperCase();
          }
        }
      }
    }
  } catch (e) {
    console.error('Error fetching data:', e);
  }

  try {
    const imageBuffer = await generarFlyerBasico(flyerData);
    
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      }
    });
  } catch (error) {
    console.error('Error generating flyer:', error);
    return NextResponse.json({ error: 'Error generating flyer' }, { status: 500 });
  }
}
