import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const codigo = searchParams.get('codigo');

    let referrerName = 'Un amigo';
    let orgName = 'FRUTOS';
    let orgLogo: string | null = null;
    let whatsappBgImage: string | null = null;
    let visionName = 'Próximo Entrenamiento';
    let visionFechas = '';
    let visionLugar = '';

    if (codigo) {
      const referrer = await prisma.usuario.findFirst({
        where: { referralCode: codigo },
        select: {
          name: true,
          organizationId: true,
          organization: {
            select: {
              name: true,
              logoUrl: true,
              whatsappInviteImageUrl: true,
            }
          }
        }
      });

      if (referrer) {
        referrerName = referrer.name || 'Un amigo';
        orgName = referrer.organization?.name || 'FRUTOS';
        orgLogo = referrer.organization?.logoUrl || null;
        whatsappBgImage = referrer.organization?.whatsappInviteImageUrl || null;

        // Buscar la próxima visión activa de la organización
        if (referrer.organizationId) {
          const nextVision = await prisma.vision.findFirst({
            where: {
              organizationId: referrer.organizationId,
              tipo: 'BASIC',
              status: 'ACTIVE',
              fechaInicio: { gte: new Date() }
            },
            orderBy: { fechaInicio: 'asc' },
            select: {
              nombre: true,
              fechaInicio: true,
              fechaFin: true,
              lugar: true
            }
          });

          if (nextVision) {
            visionName = nextVision.nombre;
            if (nextVision.fechaInicio) {
              const inicio = new Date(nextVision.fechaInicio);
              const fin = nextVision.fechaFin ? new Date(nextVision.fechaFin) : null;
              
              const formatDate = (d: Date) => d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
              visionFechas = fin 
                ? `${formatDate(inicio)} - ${formatDate(fin)}`
                : formatDate(inicio);
            }
            visionLugar = nextVision.lugar || '';
          }
        }
      }
    }

    // Si hay imagen de fondo personalizada, usarla
    if (whatsappBgImage) {
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
              src={whatsappBgImage}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
            
            {/* Overlay con información */}
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                display: 'flex',
                flexDirection: 'column',
                padding: '30px',
                background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.7) 50%, transparent 100%)',
              }}
            >
              {/* Badge de invitación */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '15px',
                }}
              >
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    fontWeight: 700,
                    color: 'white',
                  }}
                >
                  {referrerName.charAt(0).toUpperCase()}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ color: '#94a3b8', fontSize: '14px' }}>Te invita</span>
                  <span style={{ color: 'white', fontSize: '18px', fontWeight: 600 }}>
                    {referrerName}
                  </span>
                </div>
              </div>
              
              {/* Botón de registro */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '18px',
                  fontWeight: 700,
                  alignSelf: 'flex-start',
                }}
              >
                ¡Regístrate Ahora! →
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

    // Fallback: Generar imagen con diseño predeterminado
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
            position: 'relative',
          }}
        >
          {/* Decorative elements */}
          <div
            style={{
              position: 'absolute',
              top: '-100px',
              left: '-100px',
              width: '400px',
              height: '400px',
              background: 'radial-gradient(circle, rgba(168, 85, 247, 0.3) 0%, transparent 70%)',
              borderRadius: '50%',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '-100px',
              right: '-100px',
              width: '400px',
              height: '400px',
              background: 'radial-gradient(circle, rgba(236, 72, 153, 0.3) 0%, transparent 70%)',
              borderRadius: '50%',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '600px',
              height: '600px',
              background: 'radial-gradient(circle, rgba(251, 191, 36, 0.15) 0%, transparent 70%)',
              borderRadius: '50%',
            }}
          />

          {/* Content */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              padding: '60px',
              position: 'relative',
            }}
          >
            {/* Logo de organización */}
            {orgLogo && (
              <img
                src={orgLogo}
                style={{
                  width: '100px',
                  height: '100px',
                  objectFit: 'contain',
                  marginBottom: '20px',
                }}
              />
            )}

            {/* Badge */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.2) 0%, rgba(249, 115, 22, 0.2) 100%)',
                border: '2px solid rgba(251, 191, 36, 0.4)',
                borderRadius: '50px',
                marginBottom: '30px',
              }}
            >
              <span style={{ fontSize: '24px' }}>✨</span>
              <span style={{ color: '#fcd34d', fontSize: '20px', fontWeight: 600 }}>
                Invitación Especial
              </span>
            </div>

            {/* Title */}
            <div
              style={{
                fontSize: '56px',
                fontWeight: 900,
                background: 'linear-gradient(135deg, #ffffff 0%, #e0e7ff 50%, #ffffff 100%)',
                backgroundClip: 'text',
                color: 'transparent',
                textAlign: 'center',
                lineHeight: 1.1,
                marginBottom: '15px',
              }}
            >
              Entrenamiento Básico
            </div>

            {/* Subtitle */}
            <div
              style={{
                fontSize: '32px',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #fbbf24 0%, #f97316 100%)',
                backgroundClip: 'text',
                color: 'transparent',
                marginBottom: '10px',
              }}
            >
              Transformación Cuántica
            </div>

            {/* Vision name if available */}
            {visionName && visionName !== 'Próximo Entrenamiento' && (
              <div
                style={{
                  fontSize: '24px',
                  color: '#94a3b8',
                  marginBottom: '30px',
                }}
              >
                {visionName} {visionFechas && `• ${visionFechas}`}
              </div>
            )}

            {/* Inviter */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '16px 32px',
                background: 'rgba(30, 27, 75, 0.8)',
                border: '2px solid rgba(168, 85, 247, 0.4)',
                borderRadius: '20px',
                marginBottom: '30px',
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '28px',
                  fontWeight: 700,
                  color: 'white',
                }}
              >
                {referrerName.charAt(0).toUpperCase()}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ color: '#94a3b8', fontSize: '16px' }}>Te invita</span>
                <span style={{ color: 'white', fontSize: '24px', fontWeight: 600 }}>
                  {referrerName}
                </span>
              </div>
            </div>

            {/* CTA */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px 40px',
                background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 50%, #f97316 100%)',
                borderRadius: '16px',
                color: 'white',
                fontSize: '24px',
                fontWeight: 700,
              }}
            >
              ¡Regístrate Ahora! →
            </div>

            {/* Footer */}
            <div
              style={{
                position: 'absolute',
                bottom: '30px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#64748b',
                fontSize: '18px',
              }}
            >
              <span>🌟</span>
              <span>{orgName}</span>
            </div>
          </div>

          {/* Top gradient bar */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '6px',
              background: 'linear-gradient(90deg, #a855f7 0%, #ec4899 50%, #f97316 100%)',
            }}
          />
          
          {/* Bottom gradient bar */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '6px',
              background: 'linear-gradient(90deg, #fbbf24 0%, #f97316 50%, #ec4899 100%)',
            }}
          />
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (error) {
    logger.error('Error generating OG image:', error);
    
    // Fallback image
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
          <div style={{ fontSize: '32px', color: '#fbbf24', marginTop: '16px' }}>
            Transformación Cuántica
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  }
}
