'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';

interface PersonalTask {
  id: number;
  titulo: string;
  descripcion: string | null;
  dueDate: Date;
  status: 'PENDING' | 'COMPLETED';
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface PersonalTaskCardProps {
  task: PersonalTask;
  onTaskUpdated: () => void;
}

export default function PersonalTaskCard({ task, onTaskUpdated }: PersonalTaskCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isCompleted = task.status === 'COMPLETED';

  const handleToggleComplete = async () => {
    setIsUpdating(true);

    try {
      const newStatus = isCompleted ? 'PENDING' : 'COMPLETED';
      
      const response = await fetch(`/api/personal-tasks/${task.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error actualizando tarea');
      }

      toast.success(isCompleted ? '↩️ Tarea reabierta' : '✅ Tarea completada');
      onTaskUpdated();
    } catch (error) {
      console.error('Error actualizando tarea:', error);
      toast.error('Error al actualizar la tarea');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    setIsUpdating(true);

    try {
      const response = await fetch(`/api/personal-tasks/${task.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error eliminando tarea');
      }

      toast.success('🗑️ Tarea eliminada');
      onTaskUpdated();
    } catch (error) {
      console.error('Error eliminando tarea:', error);
      toast.error('Error al eliminar la tarea');
    } finally {
      setIsUpdating(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div
      className={`rounded-xl border p-4 transition-all ${
        isCompleted
          ? 'bg-[#0f111a]/50 border-gray-800 opacity-60'
          : 'bg-[#1a1d2e] border-gray-700 hover:border-purple-500/50 shadow-sm hover:shadow-purple-500/10'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button
          onClick={handleToggleComplete}
          disabled={isUpdating}
          className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
            isCompleted
              ? 'bg-green-500 border-green-500 shadow-lg shadow-green-500/20'
              : 'border-gray-600 hover:border-purple-500 hover:bg-purple-500/10'
          }`}
        >
          {isCompleted && (
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3
            className={`font-semibold text-base mb-1 ${
              isCompleted ? 'line-through text-gray-500' : 'text-white'
            }`}
          >
            {task.titulo}
          </h3>
          
          {task.descripcion && (
            <p
              className={`text-sm mb-2 ${
                isCompleted ? 'text-gray-600' : 'text-gray-400'
              }`}
            >
              {task.descripcion}
            </p>
          )}

          <div className="flex items-center gap-3 text-xs">
            <span className={`inline-flex items-center gap-1 ${
              isCompleted ? 'text-gray-600' : 'text-purple-400'
            }`}>
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
              </svg>
              Personal
            </span>
            
            {isCompleted && task.completedAt && (
              <span className="inline-flex items-center gap-1 text-green-400">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Completada
              </span>
            )}
          </div>
        </div>

        {/* Delete button */}
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isUpdating}
            className="flex-shrink-0 p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            title="Eliminar tarea"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        ) : (
          <div className="flex gap-1">
            <button
              onClick={handleDelete}
              disabled={isUpdating}
              className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-lg transition-all disabled:opacity-50 shadow-lg shadow-red-500/20"
            >
              Eliminar
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isUpdating}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs font-medium rounded-lg transition-all disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
