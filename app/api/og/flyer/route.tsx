import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const codigo = searchParams.get('codigo');
  
  let referrerName = 'Invitado';
  let orgName = 'FRUTOS';
  
  try {
    if (codigo) {
      const referrer = await prisma.usuario.findFirst({
        where: { referralCode: codigo },
        select: {
          nombre: true,
          Organization_Usuario_organizationIdToOrganization: {
            select: { name: true }
          }
        }
      });
      
      if (referrer) {
        referrerName = referrer.nombre || 'Invitado';
        orgName = referrer.Organization_Usuario_organizationIdToOrganization?.name || 'FRUTOS';
      }
    }
  } catch (e) {
    console.error('DB Error:', e);
  }

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
          background: 'linear-gradient(180deg, #0a1628 0%, #1a365d 50%, #c9a227 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Nombre de organización */}
        <div style={{ fontSize: '24px', color: '#63b3ed', letterSpacing: '6px', marginBottom: '40px' }}>
          {orgName.toUpperCase()}
        </div>
        
        {/* Título principal */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          border: '3px solid rgba(99, 179, 237, 0.4)',
          padding: '40px 60px',
          marginBottom: '40px'
        }}>
          <div style={{ fontSize: '20px', color: '#63b3ed', letterSpacing: '8px', marginBottom: '10px' }}>
            ENTRENAMIENTO
          </div>
          <div style={{ fontSize: '80px', fontWeight: 900, color: 'white', lineHeight: 1 }}>
            BÁSICO
          </div>
          <div style={{ fontSize: '90px', fontWeight: 900, color: '#63b3ed', lineHeight: 1 }}>
            CUÁNTICO
          </div>
        </div>

        {/* Tagline */}
        <div style={{ fontSize: '22px', fontStyle: 'italic', color: '#e2e8f0', marginBottom: '30px', textAlign: 'center', maxWidth: '80%' }}>
          Rompe tus límites mentales y transforma tus resultados en 3 días
        </div>

        {/* Te invita */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '15px',
          background: 'rgba(99, 179, 237, 0.2)',
          padding: '15px 30px',
          borderRadius: '50px',
          border: '1px solid rgba(99, 179, 237, 0.4)'
        }}>
          <div style={{ 
            width: '50px', 
            height: '50px', 
            borderRadius: '50%', 
            background: 'linear-gradient(135deg, #63b3ed 0%, #3182ce 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            fontWeight: 700,
            color: 'white'
          }}>
            {referrerName.charAt(0).toUpperCase()}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ color: '#94a3b8', fontSize: '14px' }}>Te invita</span>
            <span style={{ color: 'white', fontSize: '20px', fontWeight: 600 }}>{referrerName}</span>
          </div>
        </div>

        {/* Barra dorada inferior */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '8px',
          background: 'linear-gradient(90deg, #c9a227 0%, #f6e05e 50%, #c9a227 100%)',
        }} />
      </div>
    ),
    {
      width: 1080,
      height: 1080,
    }
  );
}
