'use client';

import React, { useState, useEffect } from 'react';
import { Clock, Plus, Trash2, Calendar, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface TimeBlock {
  id?: string;
  dayOfWeek?: number;
  specificDate?: string;
  startTime: string;
  endTime: string;
  slotDuration: number;
}

interface AvailabilityConfigProps {
  squadId?: string;
  onSave?: (blocks: TimeBlock[]) => void;
  onSkip?: () => void;
  existingBlocks?: TimeBlock[];
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
];

// Generar opciones de hora (5:00 AM - 10:00 AM)
const TIME_OPTIONS: string[] = [];
for (let h = 5; h <= 10; h++) {
  for (let m = 0; m < 60; m += 15) {
    if (h === 10 && m > 0) break;
    TIME_OPTIONS.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
  }
}

export default function AvailabilityConfig({ 
  squadId, 
  onSave, 
  onSkip,
  existingBlocks = [] 
}: AvailabilityConfigProps) {
  const [blocks, setBlocks] = useState<TimeBlock[]>(existingBlocks.length > 0 ? existingBlocks : [
    { startTime: '06:00', endTime: '07:00', slotDuration: 10 }
  ]);
  const [mode, setMode] = useState<'weekly' | 'specific'>('weekly');
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]); // Lun-Vie por defecto
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const addBlock = () => {
    setBlocks(prev => [...prev, { startTime: '06:00', endTime: '07:00', slotDuration: 10 }]);
  };

  const removeBlock = (index: number) => {
    setBlocks(prev => prev.filter((_, i) => i !== index));
  };

  const updateBlock = (index: number, field: keyof TimeBlock, value: string | number) => {
    setBlocks(prev => prev.map((block, i) => {
      if (i === index) {
        return { ...block, [field]: value };
      }
      return block;
    }));
  };

  const toggleDay = (day: number) => {
    setSelectedDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day].sort()
    );
  };

  const handleSave = async () => {
    setSaving(true);
    
    try {
      // Crear bloques para cada día seleccionado
      const blocksToCreate = blocks.flatMap(block => 
        selectedDays.map(day => ({
          ...block,
          dayOfWeek: day,
          squadId,
        }))
      );

      // Llamar a la API para cada bloque
      for (const block of blocksToCreate) {
        const res = await fetch('/api/gc-calls/availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(block),
        });

        if (!res.ok) {
          const data = await res.json();
          console.error('Error creating block:', data.error);
        }
      }

      setSaved(true);
      onSave?.(blocksToCreate);
      
      // Reset saved status after 2s
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Error saving availability:', error);
    } finally {
      setSaving(false);
    }
  };

  // Calcular slots por bloque
  const calculateSlots = (start: string, end: string, duration: number) => {
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    return Math.floor((endMinutes - startMinutes) / duration);
  };

  return (
    <Card className="bg-white/10 border-white/20 backdrop-blur-lg">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-purple-400" />
          Configura tu Horario de Llamadas
        </CardTitle>
        <CardDescription className="text-white/70">
          Define tus bloques de disponibilidad para llamadas con participantes (5:00 AM - 10:00 AM)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Selector de días */}
        <div>
          <label className="text-sm text-white/80 mb-2 block">Días disponibles</label>
          <div className="flex flex-wrap gap-2">
            {DAYS_OF_WEEK.map(day => (
              <button
                key={day.value}
                onClick={() => toggleDay(day.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  selectedDays.includes(day.value)
                    ? 'bg-purple-500 text-white'
                    : 'bg-white/10 text-white/60 hover:bg-white/20'
                }`}
              >
                {day.label.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>

        {/* Bloques de tiempo */}
        <div className="space-y-3">
          <label className="text-sm text-white/80">Bloques de tiempo</label>
          
          {blocks.map((block, index) => (
            <div 
              key={index}
              className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10"
            >
              <div className="flex-1 grid grid-cols-3 gap-3">
                {/* Hora inicio */}
                <div>
                  <label className="text-xs text-white/50 block mb-1">Inicio</label>
                  <select
                    value={block.startTime}
                    onChange={(e) => updateBlock(index, 'startTime', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm"
                  >
                    {TIME_OPTIONS.map(time => (
                      <option key={time} value={time} className="text-gray-900">
                        {time}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Hora fin */}
                <div>
                  <label className="text-xs text-white/50 block mb-1">Fin</label>
                  <select
                    value={block.endTime}
                    onChange={(e) => updateBlock(index, 'endTime', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm"
                  >
                    {TIME_OPTIONS.filter(t => t > block.startTime).map(time => (
                      <option key={time} value={time} className="text-gray-900">
                        {time}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Duración slot */}
                <div>
                  <label className="text-xs text-white/50 block mb-1">Duración</label>
                  <select
                    value={block.slotDuration}
                    onChange={(e) => updateBlock(index, 'slotDuration', parseInt(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm"
                  >
                    <option value={10} className="text-gray-900">10 min</option>
                    <option value={15} className="text-gray-900">15 min</option>
                    <option value={20} className="text-gray-900">20 min</option>
                  </select>
                </div>
              </div>

              {/* Slots calculados */}
              <div className="text-center px-3">
                <span className="text-2xl font-bold text-purple-400">
                  {calculateSlots(block.startTime, block.endTime, block.slotDuration)}
                </span>
                <p className="text-xs text-white/50">citas</p>
              </div>

              {/* Botón eliminar */}
              {blocks.length > 1 && (
                <button
                  onClick={() => removeBlock(index)}
                  className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}

          <button
            onClick={addBlock}
            className="w-full py-2 border-2 border-dashed border-white/20 rounded-lg text-white/60 hover:text-white hover:border-white/40 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Agregar otro bloque
          </button>
        </div>

        {/* Resumen */}
        <div className="p-4 rounded-lg bg-purple-500/20 border border-purple-500/30">
          <h4 className="text-sm font-medium text-purple-300 mb-2">Resumen de disponibilidad</h4>
          <div className="text-white/80 text-sm">
            <p>
              <strong>{selectedDays.length}</strong> días por semana × {' '}
              <strong>{blocks.reduce((acc, b) => acc + calculateSlots(b.startTime, b.endTime, b.slotDuration), 0)}</strong> citas por día = {' '}
              <strong className="text-purple-300">
                {selectedDays.length * blocks.reduce((acc, b) => acc + calculateSlots(b.startTime, b.endTime, b.slotDuration), 0)}
              </strong> citas semanales
            </p>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex gap-3">
          {onSkip && (
            <Button
              variant="outline"
              onClick={onSkip}
              className="flex-1 bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              Configurar después
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={saving || selectedDays.length === 0 || blocks.length === 0}
            className={`flex-1 ${
              saved 
                ? 'bg-green-500 hover:bg-green-600' 
                : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
            }`}
          >
            {saving ? (
              'Guardando...'
            ) : saved ? (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                ¡Guardado!
              </>
            ) : (
              'Guardar disponibilidad'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
