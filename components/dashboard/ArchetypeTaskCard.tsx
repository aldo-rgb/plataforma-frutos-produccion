'use client';

import { useState } from 'react';
import { Star, CheckCircle, Sparkles, Loader2, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ArchetypeTaskCardProps {
  task: {
    id: string;
    submissionId: number;
    title: string;
    description: string;
    pointsReward?: number;
    status: string;
  };
  onComplete: (submissionId: number) => Promise<void>;
}

export default function ArchetypeTaskCard({ task, onComplete }: ArchetypeTaskCardProps) {
  const router = useRouter();
  const [isCompleting, setIsCompleting] = useState(false);
  const isCompleted = task.status === 'COMPLETED' || task.status === 'APPROVED';

  const handleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCompleted || isCompleting) return;
    
    setIsCompleting(true);
    try {
      await onComplete(task.submissionId);
    } catch (error) {
      console.error('Error completing task:', error);
    } finally {
      setIsCompleting(false);
    }
  };

  const handleViewPersonaje = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push('/dashboard/participante/mis-arquetipos');
  };

  return (
    <div 
      className="relative bg-gradient-to-r from-violet-900/30 to-fuchsia-900/30 rounded-xl border-2 border-violet-500/40 p-4 mb-3 transition-all hover:border-violet-500/60 hover:shadow-lg hover:shadow-violet-500/20"
    >
      
      {/* Badge de Personaje */}
      <div className="absolute -top-2 -right-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 shadow-lg">
        <Star size={10} />
        Personaje
      </div>

      {/* Points Badge */}
      {task.pointsReward && task.pointsReward > 0 && (
        <div className="absolute -top-2 left-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] px-2 py-1 rounded-full font-bold flex items-center gap-1 shadow-lg">
          <Sparkles size={10} />
          +{task.pointsReward} PC
        </div>
      )}

      <div className="flex items-start gap-4 mt-2">
        {/* Icon */}
        <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
          isCompleted 
            ? 'bg-green-500/20 border-2 border-green-500' 
            : 'bg-violet-500/20 border-2 border-violet-500/50'
        }`}>
          {isCompleted ? (
            <CheckCircle className="w-6 h-6 text-green-400" />
          ) : (
            <Star className="w-6 h-6 text-violet-400" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className={`text-base font-semibold ${isCompleted ? 'text-gray-500 line-through' : 'text-white'}`}>
            {task.title}
          </h4>
          <p className="text-sm text-slate-400 mt-1 line-clamp-2">
            {task.description}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex-shrink-0 flex items-center gap-2">
          {/* Ver Personaje Button */}
          <button
            onClick={handleViewPersonaje}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-all"
          >
            <Eye className="w-4 h-4" />
            Ver Personaje
          </button>

          {/* Complete Button */}
          {isCompleted ? (
            <div className="flex items-center gap-1.5 text-green-400 text-sm font-medium px-3 py-2">
              <CheckCircle className="w-4 h-4" />
              Completado
            </div>
          ) : (
            <button
              onClick={handleComplete}
              disabled={isCompleting}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50 cursor-pointer"
            >
              {isCompleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Completando...
                </>
              ) : (
                <>
                  <Star className="w-4 h-4" />
                  ¡Completar!
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
