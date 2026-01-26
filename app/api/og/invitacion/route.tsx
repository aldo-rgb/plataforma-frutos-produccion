import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const codigo = searchParams.get('codigo');

    let referrerName = 'Un amigo';
    let orgName = 'FRUTOS';
    let orgLogo: string | null = null;

    if (codigo) {
      const referrer = await prisma.user.findFirst({
        where: { referralCode: codigo },
        select: {
          name: true,
          organization: {
            select: {
              name: true,
              logoUrl: true,
            }
          }
        }
      });

      if (referrer) {
        referrerName = referrer.name || 'Un amigo';
        orgName = referrer.organization?.name || 'FRUTOS';
        orgLogo = referrer.organization?.logoUrl || null;
      }
    }

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
                fontSize: '64px',
                fontWeight: 900,
                background: 'linear-gradient(135deg, #ffffff 0%, #e0e7ff 50%, #ffffff 100%)',
                backgroundClip: 'text',
                color: 'transparent',
                textAlign: 'center',
                lineHeight: 1.1,
                marginBottom: '20px',
              }}
            >
              Entrenamiento Básico
            </div>

            {/* Subtitle */}
            <div
              style={{
                fontSize: '36px',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #fbbf24 0%, #f97316 100%)',
                backgroundClip: 'text',
                color: 'transparent',
                marginBottom: '40px',
              }}
            >
              Transformación Cuántica
            </div>

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
                marginBottom: '40px',
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

            {/* Features */}
            <div
              style={{
                display: 'flex',
                gap: '20px',
                marginBottom: '30px',
              }}
            >
              {['🎯 3 días intensivos', '💫 Transformación real', '🤝 Comunidad'].map((text, i) => (
                <div
                  key={i}
                  style={{
                    padding: '12px 20px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    color: 'white',
                    fontSize: '18px',
                  }}
                >
                  {text}
                </div>
              ))}
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
              <span>{orgName} • quantummatter.app</span>
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
    console.error('Error generating OG image:', error);
    
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
