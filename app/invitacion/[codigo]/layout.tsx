import { Metadata } from 'next';
import { prisma } from '@/lib/prisma';

interface Props {
  params: Promise<{ codigo: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { codigo } = await params;
  
  try {
    // Obtener datos del referente
    const referrer = await prisma.user.findFirst({
      where: { referralCode: codigo },
      select: {
        name: true,
        organization: {
          select: {
            name: true,
            logoUrl: true
          }
        }
      }
    });

    const referrerName = referrer?.name || 'Un amigo';
    const orgName = referrer?.organization?.name || 'FRUTOS';
    
    const title = `${referrerName} te invita al Entrenamiento Básico`;
    const description = `¡Has sido invitado al Entrenamiento Básico de Transformación Cuántica! Una experiencia de 3 días que transformará tu vida. Regístrate ahora.`;

    // URL de la imagen OG dinámica
    const ogImageUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://quantummatter.app'}/api/og/invitacion?codigo=${codigo}`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'website',
        url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://quantummatter.app'}/invitacion/${codigo}`,
        images: [
          {
            url: ogImageUrl,
            width: 1200,
            height: 630,
            alt: `Invitación de ${referrerName} - Entrenamiento Básico`,
          },
        ],
        siteName: orgName,
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [ogImageUrl],
      },
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Invitación - Entrenamiento Básico',
      description: 'Has sido invitado al Entrenamiento Básico de Transformación Cuántica.',
    };
  }
}

export default function InvitacionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
