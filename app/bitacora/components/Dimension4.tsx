// Dimensión 4: Espejos y Creencias
'use client';

import { motion } from 'framer-motion';
import { Heart, Eye, Users, BookOpen, Briefcase, Zap } from 'lucide-react';

interface Dimension4Props {
  data: any;
  onChange: (data: any) => void;
}

const QUESTIONS = [
  {
    id: 'externalPerception',
    icon: Eye,
    title: 'Percepción Externa',
    question: 'Las personas que te conocen, ¿cómo te describirían?',
    placeholder: 'Piensa en tu familia, amigos, compañeros de trabajo... ¿qué dirían de ti?',
  },
  {
    id: 'friendsPerception',
    icon: Users,
    title: 'Amistades',
    question: '¿Consideras que tienes amigos? ¿Cómo crees que te ven ellos?',
    placeholder: 'Reflexiona sobre tus amistades actuales, su profundidad, y cómo te perciben...',
  },
  {
    id: 'religiousBeliefs',
    icon: BookOpen,
    title: 'Creencias y Espiritualidad',
    question: 'Describe tus costumbres religiosas (pasado y presente) y cómo las practicas.',
    placeholder: 'Tu relación con la religión, espiritualidad, o creencias que guían tu vida...',
  },
  {
    id: 'educationBeliefs',
    icon: BookOpen,
    title: 'Educación',
    question: 'Describe tu educación, tus creencias y tus sentimientos hacia ella.',
    placeholder: 'Tu experiencia educativa, lo que aprendiste, lo que te faltó, cómo te marcó...',
  },
  {
    id: 'workDescription',
    icon: Briefcase,
    title: 'Vida Profesional',
    question: 'Describe tu trabajo o carrera y cómo te sientes de tenerla.',
    placeholder: 'Tu situación laboral actual, tu satisfacción, tus frustraciones, tus ambiciones...',
  },
  {
    id: 'triggers',
    icon: Zap,
    title: 'Detonantes',
    question: '¿Cuáles son los eventos, actividades o personas que te molestan? ¿Cómo reaccionas ante ello?',
    placeholder: 'Esas situaciones que te sacan de tu centro, que despiertan emociones intensas...',
  },
];

export default function Dimension4({ data, onChange }: Dimension4Props) {
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
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
          <Heart className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Espejos y Creencias</h2>
        <p className="text-gray-400">Tu entorno social y las lentes con las que ves el mundo</p>
      </div>

      <div className="space-y-6">
        {QUESTIONS.map((q, index) => {
          const Icon = q.icon;
          return (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-6 bg-gray-800/30 border border-gray-700 rounded-2xl space-y-4 hover:border-pink-500/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-pink-400" />
                </div>
                <h3 className="font-semibold text-white">{q.title}</h3>
              </div>

              <label className="block text-sm font-medium text-gray-300">
                {q.question}
              </label>
              
              <textarea
                value={data[q.id] || ''}
                onChange={(e) => onChange({ [q.id]: e.target.value })}
                onPaste={handlePaste}
                placeholder={q.placeholder}
                className="w-full h-32 px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-pink-500 outline-none resize-none transition-all"
              />
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
