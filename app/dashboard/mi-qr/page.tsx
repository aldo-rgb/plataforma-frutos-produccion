'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import PersonalQRWidget from '@/components/dashboard/PersonalQRWidget';

interface UserData {
  id: number;
  nombre: string;
  email: string;
  referralCode?: string;
  organizationId?: number | null;
  organizationName?: string;
  squadName?: string;
}

export default function MiQRPage() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch('/api/me/dashboard-stats');
        if (!response.ok) {
          throw new Error('Error al cargar datos del usuario');
        }
        const data = await response.json();
        if (data.success && data.data) {
          setUserData({
            id: data.data.userId,
            nombre: data.data.userName,
            email: data.data.userEmail || '',
            referralCode: data.data.referralCode,
            organizationId: data.data.organizationId,
            organizationName: data.data.organizationName,
          });
        } else {
          throw new Error('Datos de usuario no disponibles');
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Cargando tu QR personal...</span>
        </div>
      </div>
    );
  }

  if (error || !userData) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || 'No se pudieron cargar tus datos'}</p>
          <Link 
            href="/dashboard"
            className="text-blue-400 hover:text-blue-300 underline"
          >
            Volver al dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link 
            href="/dashboard"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al dashboard
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Mi QR Personal</h1>
          <p className="text-slate-400 mt-2">
            Comparte tu código QR para invitar personas a unirse a FRUTOS
          </p>
        </div>

        {/* QR Widget */}
        <PersonalQRWidget
          userName={userData.nombre}
          userId={userData.id}
          userEmail={userData.email}
          referralCode={userData.referralCode}
          organizationId={userData.organizationId}
          organizationName={userData.organizationName}
          squadName={userData.squadName}
        />
      </div>
    </div>
  );
}
