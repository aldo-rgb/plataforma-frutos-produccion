import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const codigo = searchParams.get('codigo');
  const preview = searchParams.get('preview') === 'true';
  const orgId = searchParams.get('org');
  
  let referrerName = 'Invitado';
  let orgName = 'TRANSFORMACIÓN CUÁNTICA';
  let orgLogo = '';
  let visionName = 'VISIÓN 25';
  let visionLocation = 'MONTERREY';
  let visionDates = '20 - 22 De Febrero';
  let visionDays = 'VIERNES A DOMINGO';
  let locationDetail = '';
  let whatsappNumber = '';
  let headline = 'ROMPE TUS LÍMITES MENTALES Y TRANSFORMA TUS RESULTADOS EN 3 DÍAS.';
  let urgencyText = '¡CUPO LIMITADO!';
  let showUrgency = true;
  let ctaText = 'ESCANEA PARA ASEGURAR TU LUGAR';
  let backgroundUrl = '';
  
  try {
    // Si es preview con orgId, obtener datos de la organización
    if (preview && orgId) {
      const organization = await prisma.organization.findUnique({
        where: { id: parseInt(orgId) },
        select: {
          name: true,
          logoUrl: true,
          flyerBackgroundUrl: true,
          flyerHeadline: true,
          flyerSubheadline: true,
          flyerLocationDetail: true,
          flyerShowUrgencyBadge: true,
          flyerUrgencyText: true,
          flyerCtaText: true,
          flyerWhatsappNumber: true,
        }
      });
      
      if (organization) {
        orgName = organization.name || orgName;
        orgLogo = organization.logoUrl || '';
        backgroundUrl = organization.flyerBackgroundUrl || '';
        headline = organization.flyerHeadline || headline;
        locationDetail = organization.flyerLocationDetail || '';
        showUrgency = organization.flyerShowUrgencyBadge ?? true;
        urgencyText = organization.flyerUrgencyText || urgencyText;
        ctaText = organization.flyerCtaText || ctaText;
        whatsappNumber = organization.flyerWhatsappNumber || '';
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
        }
      });
      
      if (nextVision) {
        visionName = nextVision.nombre || visionName;
        if (nextVision.startDate) {
          const start = new Date(nextVision.startDate);
          const end = nextVision.endDate ? new Date(nextVision.endDate) : null;
          
          const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                         'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
          const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
          
          if (end) {
            visionDates = `${start.getDate()} - ${end.getDate()} De ${months[start.getMonth()]}`;
            visionDays = `${days[start.getDay()].toUpperCase()} A ${days[end.getDay()].toUpperCase()}`;
          } else {
            visionDates = `${start.getDate()} De ${months[start.getMonth()]}`;
            visionDays = days[start.getDay()].toUpperCase();
          }
        }
      }
    }
    
    // Si tiene código de referido, obtener datos del referente
    if (codigo) {
      const referrer = await prisma.usuario.findFirst({
        where: { referralCode: codigo },
        select: {
          nombre: true,
          Organization_Usuario_organizationIdToOrganization: {
            select: { 
              name: true,
              logoUrl: true,
              flyerBackgroundUrl: true,
              flyerHeadline: true,
              flyerLocationDetail: true,
              flyerShowUrgencyBadge: true,
              flyerUrgencyText: true,
              flyerCtaText: true,
              flyerWhatsappNumber: true,
            }
          }
        }
      });
      
      if (referrer) {
        referrerName = referrer.nombre || 'Invitado';
        const org = referrer.Organization_Usuario_organizationIdToOrganization;
        if (org) {
          orgName = org.name || orgName;
          orgLogo = org.logoUrl || '';
          backgroundUrl = org.flyerBackgroundUrl || '';
          headline = org.flyerHeadline || headline;
          locationDetail = org.flyerLocationDetail || '';
          showUrgency = org.flyerShowUrgencyBadge ?? true;
          urgencyText = org.flyerUrgencyText || urgencyText;
          ctaText = org.flyerCtaText || ctaText;
          whatsappNumber = org.flyerWhatsappNumber || '';
        }
      }
    }
  } catch (e) {
    console.error('DB Error:', e);
  }

  // Formato horizontal como el ejemplo (1200x630)
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Background Image or Gradient */}
        {backgroundUrl ? (
          <img
            src={backgroundUrl}
            alt="background"
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <div
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              background: 'linear-gradient(180deg, #0a1628 0%, #1a365d 40%, #c9a227 100%)',
            }}
          />
        )}
        
        {/* Overlay for text readability */}
        <div
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            background: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.5) 100%)',
          }}
        />
        
        {/* Content Container */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            padding: '30px 40px',
          }}
        >
          {/* Header: Logo + Urgency Badge */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            {/* Organization Name/Logo */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <div style={{ 
                fontSize: '28px', 
                fontWeight: 800, 
                color: 'white',
                textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
                letterSpacing: '1px'
              }}>
                {orgName.toUpperCase()}
              </div>
              <div style={{ 
                fontSize: '12px', 
                color: '#94a3b8',
                letterSpacing: '4px',
                marginTop: '2px'
              }}>
                SER · HACER · TENER
              </div>
            </div>
            
            {/* Urgency Badge */}
            {showUrgency && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                background: '#dc2626',
                padding: '12px 20px',
                transform: 'rotate(3deg)',
                boxShadow: '4px 4px 0 rgba(0,0,0,0.3)',
              }}>
                <span style={{ 
                  color: 'white', 
                  fontSize: '22px', 
                  fontWeight: 900,
                  lineHeight: 1.1,
                  textAlign: 'center'
                }}>
                  {urgencyText}
                </span>
              </div>
            )}
          </div>
          
          {/* Main Content */}
          <div style={{ 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            marginTop: '-20px'
          }}>
            {/* Entrenamiento Label */}
            <div style={{
              background: 'rgba(255,255,255,0.15)',
              padding: '8px 30px',
              marginBottom: '10px',
            }}>
              <span style={{ 
                color: 'white', 
                fontSize: '18px', 
                fontWeight: 600,
                letterSpacing: '6px'
              }}>
                ENTRENAMIENTO
              </span>
            </div>
            
            {/* BÁSICO CUÁNTICO */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ 
                fontSize: '72px', 
                fontWeight: 900, 
                color: 'white',
                lineHeight: 0.9,
                textShadow: '3px 3px 6px rgba(0,0,0,0.5)',
                WebkitTextStroke: '2px rgba(255,255,255,0.3)',
              }}>
                BÁSICO
              </span>
              <span style={{ 
                fontSize: '72px', 
                fontWeight: 900, 
                color: '#38bdf8',
                lineHeight: 0.9,
                textShadow: '3px 3px 6px rgba(0,0,0,0.5)',
              }}>
                CUÁNTICO
              </span>
            </div>
            
            {/* Vision Name + Location */}
            <div style={{
              display: 'flex',
              background: 'rgba(30, 58, 138, 0.8)',
              padding: '8px 25px',
              marginTop: '15px',
              borderRadius: '4px',
            }}>
              <span style={{ 
                color: '#fbbf24', 
                fontSize: '16px', 
                fontWeight: 700,
                letterSpacing: '2px'
              }}>
                {visionName.toUpperCase()} | {visionLocation}
              </span>
            </div>
            
            {/* Headline */}
            <div style={{ 
              maxWidth: '700px', 
              textAlign: 'center', 
              marginTop: '20px' 
            }}>
              <span style={{ 
                fontSize: '22px', 
                fontWeight: 700, 
                color: 'white',
                textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
                lineHeight: 1.3,
              }}>
                {headline.toUpperCase()}
              </span>
            </div>
            
            {/* Dates */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              marginTop: '20px' 
            }}>
              <span style={{ 
                fontSize: '36px', 
                fontWeight: 800, 
                color: 'white',
                fontStyle: 'italic',
                textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
              }}>
                {visionDates}
              </span>
              <span style={{ 
                fontSize: '16px', 
                fontWeight: 600, 
                color: '#e2e8f0',
                letterSpacing: '4px',
                marginTop: '5px'
              }}>
                {visionDays}
              </span>
            </div>
          </div>
          
          {/* Footer */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'flex-end',
            marginTop: 'auto'
          }}>
            {/* Location */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {locationDetail && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '20px' }}>📍</span>
                  <span style={{ 
                    color: 'white', 
                    fontSize: '16px',
                    fontWeight: 600,
                    textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                  }}>
                    {locationDetail}
                  </span>
                </div>
              )}
            </div>
            
            {/* WhatsApp */}
            {whatsappNumber && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#25D366',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <span style={{ color: 'white', fontSize: '18px' }}>📱</span>
                </div>
                <span style={{ 
                  color: 'white', 
                  fontSize: '24px',
                  fontWeight: 700,
                  textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                }}>
                  {whatsappNumber}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
