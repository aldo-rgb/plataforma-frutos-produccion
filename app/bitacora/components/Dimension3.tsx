// Dimensión 3: Línea de Vida (Timeline)
'use client';

import { motion } from 'framer-motion';
import { Clock, Baby, User, Briefcase, ArrowRight } from 'lucide-react';

interface Dimension3Props {
  data: any;
  onChange: (data: any) => void;
}

const LIFE_STAGES = [
  {
    id: 'childhood',
    title: 'Niñez',
    icon: Baby,
    color: 'from-yellow-500 to-amber-600',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    eventField: 'childhoodEvent',
    meaningField: 'childhoodMeaning',
    eventPlaceholder: 'Describe un evento de tu niñez que te marcó profundamente...',
    meaningPlaceholder: '¿Qué significó ese evento para ti? ¿Cómo lo interpretaste?',
  },
  {
    id: 'adolescence',
    title: 'Adolescencia',
    icon: User,
    color: 'from-orange-500 to-red-600',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
    eventField: 'adolescenceEvent',
    meaningField: 'adolescenceMeaning',
    eventPlaceholder: 'El momento más difícil de tu adolescencia...',
    meaningPlaceholder: '¿Qué significado le diste en ese momento?',
  },
  {
    id: 'adulthood',
    title: 'Adultez',
    icon: Briefcase,
    color: 'from-purple-500 to-indigo-600',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    eventField: 'adulthoodEvent',
    meaningField: 'adulthoodMeaning',
    eventPlaceholder: 'El evento que definió quién eres hoy...',
    meaningPlaceholder: '¿Qué significado tiene para ti actualmente?',
  },
];

export default function Dimension3({ data, onChange }: Dimension3Props) {
  // Block paste
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
  };

  return (
    <motion.div
      className="max-w-2xl mx-auto pb-32"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <div className="text-center mb-10">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center">
          <Clock className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Línea de Vida</h2>
        <p className="text-gray-400">Los eventos emocionales que te han formado</p>
      </div>

      {/* Instructions */}
      <div className="mb-8 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
        <p className="text-sm text-amber-200/80">
          Identifica <span className="font-semibold text-amber-200">3 eventos emocionales</span> desagradables o difíciles en tu historia y el significado que les diste.
        </p>
      </div>

      {/* Timeline visualization */}
      <div className="relative mb-8">
        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-yellow-500 via-orange-500 to-purple-500" />
        <div className="flex justify-between px-4">
          {LIFE_STAGES.map((stage, index) => {
            const Icon = stage.icon;
            return (
              <motion.div
                key={stage.id}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.2 }}
                className="flex flex-col items-center"
              >
                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${stage.color} flex items-center justify-center z-10 shadow-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <span className="mt-2 text-xs text-gray-400">{stage.title}</span>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Life stage cards */}
      <div className="space-y-6">
        {LIFE_STAGES.map((stage, index) => {
          const Icon = stage.icon;
          return (
            <motion.div
              key={stage.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.15 }}
              className={`p-6 ${stage.bgColor} border ${stage.borderColor} rounded-2xl space-y-4`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${stage.color} flex items-center justify-center`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white">{stage.title}</h3>
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-300">
                  Describe el evento
                </label>
                <textarea
                  value={data[stage.eventField] || ''}
                  onChange={(e) => onChange({ [stage.eventField]: e.target.value })}
                  onPaste={handlePaste}
                  placeholder={stage.eventPlaceholder}
                  className="w-full h-32 px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-amber-500 outline-none resize-none transition-all"
                />
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-300">
                  ¿Qué significó para ti?
                </label>
                <textarea
                  value={data[stage.meaningField] || ''}
                  onChange={(e) => onChange({ [stage.meaningField]: e.target.value })}
                  onPaste={handlePaste}
                  placeholder={stage.meaningPlaceholder}
                  className="w-full h-28 px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-amber-500 outline-none resize-none transition-all"
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Closing question */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mt-8 p-6 bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700 rounded-2xl space-y-4"
      >
        <div className="flex items-center gap-3">
          <ArrowRight className="w-5 h-5 text-amber-400" />
          <h3 className="font-semibold text-white">Pregunta de Cierre</h3>
        </div>
        
        <label className="block text-sm font-medium text-gray-300">
          Los eventos que describiste anteriormente, ¿cómo han influido en tu vida actual?
        </label>
        <textarea
          value={data.eventsInfluence || ''}
          onChange={(e) => onChange({ eventsInfluence: e.target.value })}
          onPaste={handlePaste}
          placeholder="Reflexiona sobre cómo estos eventos han moldeado quién eres hoy, tus decisiones, tus miedos, tus patrones..."
          className="w-full h-40 px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-amber-500 outline-none resize-none"
        />
      </motion.div>
    </motion.div>
  );
}
