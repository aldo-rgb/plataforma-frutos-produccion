'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function ParticipanteDetailPage() {
  const router = useRouter();
  const params = useParams();
  const participanteId = params?.id as string;

  useEffect(() => {
    // Redirigir a la página de carta directamente
    router.push(`/dashboard/coordinador/participante/${participanteId}/carta`);
  }, [participanteId, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
    </div>
  );
}
