'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function CartaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkCartaStatus() {
      try {
        const res = await fetch('/api/carta/my-carta');
        const data = await res.json();

        if (res.ok && data.carta) {
          // Lógica de redirección según estado
          if (data.carta.estado === 'BORRADOR') {
            // Modo Creación: ir al wizard
            router.replace('/dashboard/carta/wizard-v2');
          } else if (data.carta.estado === 'EN_REVISION' || data.carta.estado === 'APROBADA') {
            // Modo Gestión/Revisión: ir a vista resumen
            router.replace('/dashboard/carta/resumen');
          } else {
            // Fallback al wizard
            router.replace('/dashboard/carta/wizard-v2');
          }
        } else {
          // No tiene carta, crear nueva en wizard
          router.replace('/dashboard/carta/wizard-v2');
        }
      } catch (error) {
        console.error('Error checking carta status:', error);
        router.replace('/dashboard/carta/wizard-v2');
      } finally {
        setLoading(false);
      }
    }

    checkCartaStatus();
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0f1015] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        <p className="text-gray-400">Cargando tu carta...</p>
      </div>
    </div>
  );
}
