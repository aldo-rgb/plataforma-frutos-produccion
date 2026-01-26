import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import QRCode from 'qrcode';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const codigo = searchParams.get('codigo');
    const orgId = searchParams.get('org');
    const isPreview = searchParams.get('preview') === 'true';

    let referrerName = 'Tu Nombre';
    let organizationId: number | null = orgId ? parseInt(orgId) : null;
    let qrDataUrl: string | null = null;

    // Si hay código de referido, obtener datos del usuario
    if (codigo) {
      const referrer = await prisma.usuario.findFirst({
        where: { referralCode: codigo },
        select: {
          name: true,
          organizationId: true,
        }
      });

      if (referrer) {
        referrerName = referrer.name || 'Tu Nombre';
        organizationId = referrer.organizationId;

        // Generar QR con el link de invitación
        const invitationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://quantummatter.app'}/invitacion/${codigo}`;
        qrDataUrl = await QRCode.toDataURL(invitationUrl, {
          width: 200,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#ffffff'
          },
          errorCorrectionLevel: 'H'
        });
      }
    }

    if (!organizationId) {
      return new Response('Organization not found', { status: 404 });
    }

    // Obtener configuración de la organización
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
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

    if (!organization) {
      return new Response('Organization not found', { status: 404 });
    }

    // Obtener próxima visión
    const nextVision = await prisma.vision.findFirst({
      where: {
        organizationId,
        tipo: 'BASIC',
        status: 'ACTIVE',
        fechaInicio: { gte: new Date() }
      },
      orderBy: { fechaInicio: 'asc' },
      select: {
        nombre: true,
        fechaInicio: true,
        fechaFin: true,
        lugar: true,
      }
    });

    // Formatear fechas
    let visionDates = '';
    let visionDays = '';
    if (nextVision?.fechaInicio) {
      const inicio = new Date(nextVision.fechaInicio);
      const fin = nextVision.fechaFin ? new Date(nextVision.fechaFin) : null;
      
      const dayStart = inicio.getDate();
      const dayEnd = fin ? fin.getDate() : dayStart;
      const month = inicio.toLocaleDateString('es-MX', { month: 'long' });
      
      visionDates = fin ? `${dayStart}-${dayEnd} de ${month}` : `${dayStart} de ${month}`;
      
      // Calcular días de la semana
      const dayOfWeek = (d: Date) => d.toLocaleDateString('es-MX', { weekday: 'long' });
      if (fin) {
        visionDays = `${dayOfWeek(inicio).toUpperCase()} A ${dayOfWeek(fin).toUpperCase()}`;
      }
    }

    const visionLocation = nextVision?.lugar || '';
    const fullLocation = organization.flyerLocationDetail 
      ? `${visionLocation} (${organization.flyerLocationDetail})`
      : visionLocation;

    // Si hay imagen de fondo personalizada
    if (organization.flyerBackgroundUrl) {
      return new ImageResponse(
        (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              position: 'relative',
            }}
          >
            {/* Imagen de fondo */}
            <img
              src={organization.flyerBackgroundUrl}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />

            {/* Badge de urgencia */}
            {organization.flyerShowUrgencyBadge && (
              <div
                style={{
                  position: 'absolute',
                  top: '20px',
                  right: '20px',
                  background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                  color: 'white',
                  padding: '8px 20px',
                  borderRadius: '25px',
                  fontSize: '14px',
                  fontWeight: 800,
                  letterSpacing: '1px',
                  boxShadow: '0 4px 15px rgba(220, 38, 38, 0.4)',
                }}
              >
                {organization.flyerUrgencyText || 'CUPO LIMITADO'}
              </div>
            )}

            {/* Overlay inferior con información */}
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                display: 'flex',
                flexDirection: 'column',
                padding: '30px',
                background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.8) 60%, transparent 100%)',
              }}
            >
              {/* Headline */}
              {organization.flyerHeadline && (
                <div
                  style={{
                    fontSize: '22px',
                    fontWeight: 700,
                    color: '#93c5fd',
                    marginBottom: '15px',
                    fontStyle: 'italic',
                    maxWidth: '70%',
                  }}
                >
                  {organization.flyerHeadline}
                </div>
              )}

              {/* Contenedor inferior con ubicación, WhatsApp y QR */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'space-between',
                  width: '100%',
                }}
              >
                {/* Info izquierda */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {/* Ubicación */}
                  {fullLocation && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: 'white',
                        fontSize: '16px',
                      }}
                    >
                      <span>📍</span>
                      <span>{fullLocation}</span>
                    </div>
                  )}

                  {/* WhatsApp */}
                  {organization.flyerWhatsappNumber && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: 'white',
                        fontSize: '16px',
                      }}
                    >
                      <span style={{ 
                        background: '#25D366', 
                        borderRadius: '50%', 
                        width: '24px', 
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px'
                      }}>📱</span>
                      <span>{organization.flyerWhatsappNumber}</span>
                    </div>
                  )}

                  {/* Invitado por */}
                  {!isPreview && referrerName && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginTop: '10px',
                        padding: '8px 16px',
                        background: 'rgba(147, 51, 234, 0.3)',
                        borderRadius: '20px',
                        border: '1px solid rgba(147, 51, 234, 0.5)',
                      }}
                    >
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '14px',
                          fontWeight: 700,
                          color: 'white',
                        }}
                      >
                        {referrerName.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ color: '#c4b5fd', fontSize: '11px' }}>Te invita</span>
                        <span style={{ color: 'white', fontSize: '14px', fontWeight: 600 }}>
                          {referrerName}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* QR Code a la derecha */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  {/* Contenedor del QR */}
                  <div
                    style={{
                      background: 'white',
                      padding: '10px',
                      borderRadius: '12px',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                    }}
                  >
                    {qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        style={{
                          width: '120px',
                          height: '120px',
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '120px',
                          height: '120px',
                          background: '#f1f5f9',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#64748b',
                          fontSize: '12px',
                          textAlign: 'center',
                        }}
                      >
                        QR de registro
                      </div>
                    )}
                  </div>
                  {/* Texto del CTA */}
                  <span
                    style={{
                      color: 'white',
                      fontSize: '12px',
                      fontWeight: 600,
                      textAlign: 'center',
                    }}
                  >
                    {organization.flyerCtaText || 'Escanea para registrarte'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ),
        {
          width: 1080,
          height: 1080, // Formato cuadrado para mejor compatibilidad
        }
      );
    }

    // Fallback: diseño predeterminado si no hay imagen de fondo
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            background: 'linear-gradient(180deg, #0f172a 0%, #1e1b4b 50%, #7c3aed 100%)',
            position: 'relative',
            padding: '40px',
          }}
        >
          {/* Badge de urgencia */}
          {organization.flyerShowUrgencyBadge && (
            <div
              style={{
                position: 'absolute',
                top: '30px',
                right: '30px',
                background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                color: 'white',
                padding: '10px 24px',
                borderRadius: '25px',
                fontSize: '16px',
                fontWeight: 800,
                letterSpacing: '1px',
              }}
            >
              {organization.flyerUrgencyText || 'CUPO LIMITADO'}
            </div>
          )}

          {/* Logo */}
          {organization.logoUrl && (
            <img
              src={organization.logoUrl}
              style={{
                width: '150px',
                height: '80px',
                objectFit: 'contain',
                marginBottom: '20px',
              }}
            />
          )}

          {/* Título */}
          <div
            style={{
              fontSize: '24px',
              color: '#93c5fd',
              letterSpacing: '4px',
              marginBottom: '10px',
            }}
          >
            ENTRENAMIENTO
          </div>

          <div
            style={{
              fontSize: '72px',
              fontWeight: 900,
              color: 'white',
              lineHeight: 1,
            }}
          >
            BÁSICO
          </div>

          <div
            style={{
              fontSize: '80px',
              fontWeight: 900,
              color: '#93c5fd',
              lineHeight: 1,
              marginBottom: '30px',
            }}
          >
            CUÁNTICO
          </div>

          {/* Visión */}
          {nextVision && (
            <div
              style={{
                background: '#93c5fd',
                padding: '12px 30px',
                marginBottom: '30px',
                alignSelf: 'flex-start',
              }}
            >
              <span
                style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  color: '#0f172a',
                  letterSpacing: '2px',
                }}
              >
                {nextVision.nombre?.toUpperCase()}
              </span>
            </div>
          )}

          {/* Headline */}
          {organization.flyerHeadline && (
            <div
              style={{
                fontSize: '26px',
                fontStyle: 'italic',
                color: '#e2e8f0',
                marginBottom: '20px',
                maxWidth: '80%',
              }}
            >
              {organization.flyerHeadline}
            </div>
          )}

          {/* Fechas */}
          {visionDates && (
            <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '30px' }}>
              <div
                style={{
                  fontSize: '56px',
                  fontWeight: 900,
                  color: 'white',
                }}
              >
                {visionDates.toUpperCase()}
              </div>
              {visionDays && (
                <div
                  style={{
                    fontSize: '16px',
                    color: '#94a3b8',
                    letterSpacing: '3px',
                  }}
                >
                  {visionDays}
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div
            style={{
              marginTop: 'auto',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              width: '100%',
            }}
          >
            {/* Info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {fullLocation && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'white', fontSize: '18px' }}>
                  <span>📍</span>
                  <span>{fullLocation}</span>
                </div>
              )}
              {organization.flyerWhatsappNumber && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'white', fontSize: '18px' }}>
                  <span>📱</span>
                  <span>{organization.flyerWhatsappNumber}</span>
                </div>
              )}
            </div>

            {/* QR */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <div style={{ background: 'white', padding: '10px', borderRadius: '12px' }}>
                {qrDataUrl ? (
                  <img src={qrDataUrl} style={{ width: '100px', height: '100px' }} />
                ) : (
                  <div style={{ width: '100px', height: '100px', background: '#f1f5f9' }} />
                )}
              </div>
              <span style={{ color: 'white', fontSize: '14px' }}>
                {organization.flyerCtaText || 'Escanea para registrarte'}
              </span>
            </div>
          </div>
        </div>
      ),
      {
        width: 1080,
        height: 1080,
      }
    );

  } catch (error) {
    console.error('Error generating flyer:', error);
    
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
          }}
        >
          <div style={{ fontSize: '48px', color: 'white', fontWeight: 700 }}>
            Entrenamiento Básico
          </div>
          <div style={{ fontSize: '32px', color: '#93c5fd', marginTop: '16px' }}>
            Transformación Cuántica
          </div>
        </div>
      ),
      {
        width: 1080,
        height: 1080,
      }
    );
  }
}
