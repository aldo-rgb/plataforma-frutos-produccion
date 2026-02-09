'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, Zap, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { ElCruceAccessWidget } from '@/components/el-cruce';

export default function ElAtravesarPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [trainerLevel, setTrainerLevel] = useState<'BASIC' | 'ADVANCED' | 'PL' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }
    
    if (session?.user?.rol !== 'TRAINER' && !session?.user?.esEntrenador) {
      router.push('/dashboard');
      return;
    }

    // Obtener nivel del trainer
    fetchTrainerLevel();
  }, [status, session, router]);

  const fetchTrainerLevel = async () => {
    try {
      const res = await fetch('/api/trainer/mis-entrenamientos');
      const result = await res.json();
      
      if (res.ok && result.success) {
        setTrainerLevel(result.stats?.trainerLevel || null);
      }
    } catch (error) {
      console.error('Error fetching trainer level:', error);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link 
            href="/dashboard/trainer" 
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft size={20} />
            <span>Volver al Dashboard</span>
          </Link>
          
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Zap className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">El Atravesar</h1>
              <p className="text-slate-400">Escanea gafetes y registra cruces en tiempo real</p>
            </div>
          </div>
        </div>

        {/* Widget expandido por defecto */}
        <div className="bg-gradient-to-br from-amber-900/30 via-orange-900/20 to-slate-900 border border-amber-500/30 rounded-2xl p-6">
          <ElCruceAccessWidget 
            trainerLevel={trainerLevel}
            userRole={session?.user?.rol}
            defaultExpanded={true}
            hideHeader={true}
          />
        </div>
      </div>
    </div>
  );
}
