'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BarChart3, Star, ChevronRight, Loader2 } from 'lucide-react';

interface QuickMetrics {
  totalTrainings: number;
  avgTrainerRating: string | null;
  avgGCRating: string | null;
}

export default function SurveyResultsWidget() {
  const [metrics, setMetrics] = useState<QuickMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuickMetrics();
  }, []);

  const fetchQuickMetrics = async () => {
    try {
      const res = await fetch('/api/school-admin/survey-results');
      const result = await res.json();
      
      if (res.ok && result.success) {
        setMetrics({
          totalTrainings: result.totalTrainings || 0,
          avgTrainerRating: result.aggregated?.avgTrainerRating || null,
          avgGCRating: result.aggregated?.avgGCRating || null,
        });
      }
    } catch (error) {
      console.error('Error fetching survey metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const avgRating = metrics?.avgTrainerRating || metrics?.avgGCRating;

  return (
    <Link href="/dashboard/school-admin/survey-results">
      <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl p-6 text-white hover:shadow-lg hover:scale-[1.02] transition-all cursor-pointer h-full">
        <div className="flex items-start justify-between mb-4">
          <div className="p-3 bg-white/20 rounded-lg">
            <BarChart3 className="w-6 h-6" />
          </div>
          <ChevronRight className="w-5 h-5 opacity-70" />
        </div>
        
        <h3 className="text-lg font-semibold mb-2">Resultados de Encuestas</h3>
        
        {loading ? (
          <div className="flex items-center gap-2 text-white/80">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Cargando...</span>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-white/90 text-sm">
              {metrics?.totalTrainings || 0} entrenamientos completados
            </p>
            {avgRating && (
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-300 fill-yellow-300" />
                <span className="text-sm font-medium">{avgRating}</span>
                <span className="text-white/70 text-xs">promedio</span>
              </div>
            )}
          </div>
        )}
        
        <p className="text-white/70 text-xs mt-3">
          Ver encuestas de entrenadores, GC y directores
        </p>
      </div>
    </Link>
  );
}
