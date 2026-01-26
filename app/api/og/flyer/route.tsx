import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import QRCode from 'qrcode';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
      try {
        const referrer = await prisma.usuario.findFirst({
          where: { referralCode: codigo },
          select: {
            nombre: true,
            organizationId: true,
          }
        });

        if (referrer) {
          referrerName = referrer.nombre || 'Tu Nombre';
          organizationId = referrer.organizationId;

          // Generar QR con el link de invitación
          try {
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
          } catch (qrError) {
            console.error('Error generating QR:', qrError);
            // Continuar sin QR
          }
        }
      } catch (dbError) {
        console.error('Error fetching user:', dbError);
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

    // Fallback: diseño predeterminado profesional si no hay imagen de fondo
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Fondo con gradiente estilo cósmico */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(180deg, #0a1628 0%, #1a365d 35%, #2d3748 60%, #c9a227 100%)',
            }}
          />

          {/* Efecto de luz/aurora */}
          <div
            style={{
              position: 'absolute',
              top: '10%',
              left: '20%',
              width: '60%',
              height: '40%',
              background: 'radial-gradient(ellipse, rgba(99, 179, 237, 0.25) 0%, transparent 70%)',
            }}
          />

          {/* Efecto de estrellas/partículas */}
          <div
            style={{
              position: 'absolute',
              top: '5%',
              right: '10%',
              width: '8px',
              height: '8px',
              background: 'white',
              borderRadius: '50%',
              boxShadow: '0 0 20px 5px rgba(255,255,255,0.5)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '15%',
              right: '25%',
              width: '4px',
              height: '4px',
              background: 'white',
              borderRadius: '50%',
              boxShadow: '0 0 10px 2px rgba(255,255,255,0.3)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '8%',
              left: '15%',
              width: '6px',
              height: '6px',
              background: 'white',
              borderRadius: '50%',
              boxShadow: '0 0 15px 3px rgba(255,255,255,0.4)',
            }}
          />

          {/* Contenido principal */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '50px 40px',
              position: 'relative',
              height: '100%',
            }}
          >
            {/* Badge de urgencia */}
            {(organization?.flyerShowUrgencyBadge ?? true) && (
              <div
                style={{
                  position: 'absolute',
                  top: '25px',
                  right: '25px',
                  background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                  color: 'white',
                  padding: '10px 24px',
                  borderRadius: '25px',
                  fontSize: '14px',
                  fontWeight: 800,
                  letterSpacing: '1px',
                  boxShadow: '0 4px 20px rgba(220, 38, 38, 0.5)',
                }}
              >
                {organization?.flyerUrgencyText || 'CUPO LIMITADO'}
              </div>
            )}

            {/* Logo o nombre de organización */}
            {organization?.logoUrl ? (
              <img
                src={organization.logoUrl}
                style={{
                  width: '180px',
                  height: '70px',
                  objectFit: 'contain',
                  marginBottom: '15px',
                }}
              />
            ) : (
              <div
                style={{
                  fontSize: '28px',
                  fontWeight: 800,
                  color: '#63b3ed',
                  letterSpacing: '4px',
                  marginBottom: '5px',
                }}
              >
                {organization?.name?.toUpperCase() || 'QUANTUM MATTER'}
              </div>
            )}

            {/* Subtítulo de organización */}
            <div
              style={{
                fontSize: '12px',
                color: '#94a3b8',
                letterSpacing: '6px',
                marginBottom: '25px',
              }}
            >
              SER · HACER · TENER
            </div>

            {/* Caja principal con título */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                border: '3px solid rgba(99, 179, 237, 0.4)',
                padding: '35px 60px',
                marginBottom: '20px',
              }}
            >
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: 600,
                  color: '#63b3ed',
                  letterSpacing: '8px',
                  marginBottom: '10px',
                }}
              >
                ENTRENAMIENTO
              </div>

              <div
                style={{
                  fontSize: '68px',
                  fontWeight: 900,
                  color: 'white',
                  lineHeight: 0.95,
                  marginBottom: '5px',
                  textShadow: '0 4px 30px rgba(255,255,255,0.2)',
                }}
              >
                BÁSICO
              </div>

              <div
                style={{
                  fontSize: '75px',
                  fontWeight: 900,
                  color: '#63b3ed',
                  lineHeight: 0.95,
                  textShadow: '0 4px 30px rgba(99,179,237,0.3)',
                }}
              >
                CUÁNTICO
              </div>
            </div>

            {/* Badge de visión */}
            {nextVision && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#63b3ed',
                  padding: '12px 40px',
                  marginBottom: '25px',
                }}
              >
                <span
                  style={{
                    fontSize: '18px',
                    fontWeight: 700,
                    color: '#0a1628',
                    letterSpacing: '2px',
                  }}
                >
                  {nextVision.nombre?.toUpperCase() || 'VISIÓN'}
                  {fullLocation && ` | ${fullLocation.toUpperCase()}`}
                </span>
              </div>
            )}

            {/* Headline/Tagline */}
            <div
              style={{
                fontSize: '22px',
                fontStyle: 'italic',
                color: '#e2e8f0',
                marginBottom: '20px',
                textAlign: 'center',
                maxWidth: '80%',
              }}
            >
              {organization?.flyerHeadline || 'Rompe tus límites mentales y transforma tus resultados en 3 días'}
            </div>

            {/* Fechas grandes */}
            {visionDates && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px' }}>
                <div
                  style={{
                    fontSize: '52px',
                    fontWeight: 900,
                    color: 'white',
                    textShadow: '0 2px 20px rgba(255,255,255,0.2)',
                  }}
                >
                  {visionDates.toUpperCase()}
                </div>
                {visionDays && (
                  <div
                    style={{
                      fontSize: '14px',
                      color: '#94a3b8',
                      letterSpacing: '4px',
                      marginTop: '5px',
                    }}
                  >
                    {visionDays}
                  </div>
                )}
              </div>
            )}

            {/* Sección inferior */}
            <div
              style={{
                marginTop: 'auto',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                width: '100%',
                paddingBottom: '10px',
              }}
            >
              {/* Info de contacto */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {fullLocation && !nextVision && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#e2e8f0', fontSize: '16px' }}>
                    <span>📍</span>
                    <span>{fullLocation}</span>
                  </div>
                )}
                {organization?.flyerWhatsappNumber && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#e2e8f0', fontSize: '16px' }}>
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        background: '#25D366',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <span style={{ fontSize: '16px' }}>📱</span>
                    </div>
                    <span>{organization.flyerWhatsappNumber}</span>
                  </div>
                )}

                {/* Invitado por (si no es preview) */}
                {!isPreview && referrerName && referrerName !== 'Tu Nombre' && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      marginTop: '10px',
                      padding: '10px 18px',
                      background: 'rgba(99, 179, 237, 0.15)',
                      borderRadius: '25px',
                      border: '1px solid rgba(99, 179, 237, 0.3)',
                    }}
                  >
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #63b3ed 0%, #3182ce 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                        fontWeight: 700,
                        color: 'white',
                      }}
                    >
                      {referrerName.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ color: '#94a3b8', fontSize: '11px' }}>Te invita</span>
                      <span style={{ color: 'white', fontSize: '15px', fontWeight: 600 }}>
                        {referrerName}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* QR Code */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    background: 'white',
                    padding: '12px',
                    borderRadius: '16px',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
                  }}
                >
                  {qrDataUrl ? (
                    <img src={qrDataUrl} style={{ width: '110px', height: '110px' }} />
                  ) : (
                    <div
                      style={{
                        width: '110px',
                        height: '110px',
                        background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '8px',
                      }}
                    >
                      <span style={{ fontSize: '40px' }}>📱</span>
                    </div>
                  )}
                </div>
                <span
                  style={{
                    color: 'white',
                    fontSize: '13px',
                    fontWeight: 600,
                    textAlign: 'center',
                  }}
                >
                  {organization?.flyerCtaText || 'Escanea para registrarte'}
                </span>
              </div>
            </div>
          </div>

          {/* Barra inferior dorada */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '6px',
              background: 'linear-gradient(90deg, #c9a227 0%, #f6e05e 50%, #c9a227 100%)',
            }}
          />
        </div>
      ),
      {
        width: 1080,
        height: 1080,
      }
    );

  } catch (error) {
    console.error('Error generating flyer:', error);
    
    // Diseño de error simple
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
            background: 'linear-gradient(180deg, #0a1628 0%, #1a365d 100%)',
            color: 'white',
            fontFamily: 'sans-serif',
          }}
        >
          <div style={{ fontSize: '60px', fontWeight: 700, marginBottom: '20px' }}>
            ENTRENAMIENTO BÁSICO
          </div>
          <div style={{ fontSize: '40px', color: '#63b3ed' }}>
            TRANSFORMACIÓN CUÁNTICA
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
