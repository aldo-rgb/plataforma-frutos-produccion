'use client';

import { useState, useEffect } from 'react';
import { usePhoenix } from '@/contexts/PhoenixContext';
import { Flame, Sparkles, Timer, CheckCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

interface MicroTask {
  type: string;
  label: string;
  duration: number;
  description: string;
}

export function ZenView() {
  const { phoenixSessionId, exitPhoenix } = usePhoenix();
  const [step, setStep] = useState<'options' | 'timer' | 'complete'>('options');
  const [microTasks, setMicroTasks] = useState<MicroTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);

  // Load micro-task options on mount
  useEffect(() => {
    loadOptions();
  }, []);

  // Timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isTimerActive && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            setIsTimerActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => clearInterval(interval);
  }, [isTimerActive, timeRemaining]);

  const loadOptions = async () => {
    try {
      const response = await fetch('/api/phoenix/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      
      const data = await response.json();
      
      // Si ya se completó hoy, salir automáticamente
      if (data.alreadyCompletedToday) {
        console.log('✅ Protocolo Fénix ya completado hoy');
        exitPhoenix();
        return;
      }
      
      if (data.microTaskOptions) {
        setMicroTasks(data.microTaskOptions);
      }
    } catch (error) {
      console.error('Error loading options:', error);
    }
  };

  const selectTask = async (taskType: string) => {
    try {
      const response = await fetch('/api/phoenix/select-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoenixSessionId,
          microTaskType: taskType
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setSelectedTask(data.task);
        setTimeRemaining(data.task.timer);
        setStep('timer');
      }
    } catch (error) {
      console.error('Error selecting task:', error);
    }
  };

  const startTimer = () => {
    setIsTimerActive(true);
  };

  const completeTask = async () => {
    try {
      const response = await fetch('/api/phoenix/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoenixSessionId })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setStep('complete');
        
        // PHOENIX ANIMATION 🔥
        const duration = 3000;
        const animationEnd = Date.now() + duration;
        const colors = ['#ff6b00', '#ff8c00', '#ffa500', '#ffb84d'];

        const phoenixAnimation = () => {
          const timeLeft = animationEnd - Date.now();
          
          if (timeLeft <= 0) {
            return;
          }

          confetti({
            particleCount: 3,
            angle: 60,
            spread: 55,
            origin: { x: 0, y: 0.6 },
            colors: colors,
            shapes: ['circle'],
            gravity: 0.8,
            scalar: 1.2
          });
          
          confetti({
            particleCount: 3,
            angle: 120,
            spread: 55,
            origin: { x: 1, y: 0.6 },
            colors: colors,
            shapes: ['circle'],
            gravity: 0.8,
            scalar: 1.2
          });

          requestAnimationFrame(phoenixAnimation);
        };

        phoenixAnimation();

        // Auto-exit after 3 seconds - NO RELOAD para evitar ciclo
        setTimeout(() => {
          exitPhoenix();
          // NO recargar la página, solo salir del protocolo
        }, 3000);
      }
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-6 transition-all duration-500">
      <div className="w-full max-w-2xl">
        
        {/* STEP 1: OPTIONS */}
        {step === 'options' && (
          <div className="text-center space-y-8 animate-fadeIn">
            {/* Header */}
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="relative">
                  <Flame className="w-20 h-20 text-orange-500 animate-pulse" />
                  <Sparkles className="w-8 h-8 text-yellow-400 absolute -top-2 -right-2 animate-spin-slow" />
                </div>
              </div>
              
              <h1 className="text-4xl font-bold text-white">
                Protocolo Fénix Activado
              </h1>
              
              <p className="text-xl text-slate-300 max-w-lg mx-auto leading-relaxed">
                Respira. El pasado no importa. Para ganar hoy, solo necesitamos una pequeña victoria.
              </p>
            </div>

            {/* Question */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-6">
              <p className="text-lg text-slate-200 font-semibold mb-2">
                ¿Qué es algo ridículamente pequeño que puedes hacer en los próximos minutos?
              </p>
              <p className="text-sm text-slate-400">
                Elige una micro-tarea para recuperar tu momentum
              </p>
            </div>

            {/* Micro-Task Options */}
            <div className="grid grid-cols-2 gap-4">
              {microTasks.map((task) => (
                <button
                  key={task.type}
                  onClick={() => selectTask(task.type)}
                  className="bg-slate-800/70 hover:bg-slate-700/70 border-2 border-slate-700 hover:border-orange-500 rounded-xl p-5 text-left transition-all duration-300 transform hover:scale-105 group"
                >
                  <div className="text-3xl mb-2">{task.label.split(' ')[0]}</div>
                  <div className="text-white font-semibold mb-1 group-hover:text-orange-400 transition-colors">
                    {task.label.split(' ').slice(1).join(' ')}
                  </div>
                  <div className="text-sm text-slate-400">{task.description}</div>
                  <div className="text-xs text-slate-500 mt-2">{task.duration} min</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2: TIMER */}
        {step === 'timer' && selectedTask && (
          <div className="text-center space-y-8 animate-fadeIn">
            <div className="space-y-4">
              <h2 className="text-5xl">{selectedTask.title.split(' ')[0]}</h2>
              <h1 className="text-3xl font-bold text-white">
                {selectedTask.title.split(' ').slice(1).join(' ')}
              </h1>
              <p className="text-lg text-slate-300 italic">
                {selectedTask.zenMessage}
              </p>
            </div>

            {/* Timer Display */}
            <div className="relative">
              <div className="w-64 h-64 mx-auto bg-slate-800/50 backdrop-blur-sm border-4 border-orange-500/30 rounded-full flex items-center justify-center">
                <div className="text-center">
                  <Timer className="w-12 h-12 text-orange-500 mx-auto mb-4" />
                  <div className="text-6xl font-bold text-white tabular-nums">
                    {formatTime(timeRemaining)}
                  </div>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-6 max-w-md mx-auto">
              <p className="text-slate-200 leading-relaxed">
                {selectedTask.instructions}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {!isTimerActive ? (
                <button
                  onClick={startTimer}
                  className="bg-orange-600 hover:bg-orange-500 text-white font-bold text-lg px-12 py-4 rounded-xl transition-all duration-300 transform hover:scale-105"
                >
                  Iniciar Cronómetro
                </button>
              ) : (
                <button
                  onClick={completeTask}
                  className="bg-green-600 hover:bg-green-500 text-white font-bold text-lg px-12 py-4 rounded-xl transition-all duration-300 transform hover:scale-105 flex items-center gap-3 mx-auto"
                >
                  <CheckCircle className="w-6 h-6" />
                  Marcar como Completado
                </button>
              )}
              
              <p className="text-sm text-slate-400">
                No pedimos evidencia. Confiamos en ti.
              </p>
            </div>
          </div>
        )}

        {/* STEP 3: COMPLETE */}
        {step === 'complete' && (
          <div className="text-center space-y-8 animate-fadeIn">
            <div className="space-y-6">
              <div className="flex justify-center">
                <div className="relative animate-bounce">
                  <div className="w-32 h-32 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center">
                    <Flame className="w-20 h-20 text-white" />
                  </div>
                  <div className="absolute -inset-2 bg-orange-500/20 rounded-full animate-ping"></div>
                </div>
              </div>

              <h1 className="text-5xl font-bold text-white">
                Día Reiniciado
              </h1>
              
              <p className="text-2xl text-orange-400 font-semibold">
                Estás de vuelta en control 🔥
              </p>

              {/* Badge */}
              <div className="bg-gradient-to-br from-orange-900/50 to-red-900/50 border-2 border-orange-500 rounded-2xl p-8 max-w-md mx-auto">
                <div className="text-6xl mb-4">🔥</div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  Badge Fénix Desbloqueado
                </h3>
                <p className="text-slate-300">
                  Reconocimiento por no rendirse en momentos difíciles
                </p>
                <div className="mt-4 inline-block bg-orange-500/20 text-orange-300 px-4 py-2 rounded-full text-sm font-semibold">
                  HONOR
                </div>
              </div>

              <p className="text-slate-400 text-sm max-w-md mx-auto">
                Tus tareas han sido reagendadas y organizadas. Vuelves con pizarra limpia.
              </p>
            </div>

            <div className="text-xs text-slate-500">
              Redirigiendo al dashboard...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
