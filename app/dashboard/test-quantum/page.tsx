'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

export default function TestQuantumPage() {
  const { data: session } = useSession();
  const [draftData, setDraftData] = useState<any>(null);
  const [allKeys, setAllKeys] = useState<string[]>([]);
  
  useEffect(() => {
    if (!session?.user?.email) return;
    
    // Listar todas las keys de localStorage
    const keys = Object.keys(localStorage);
    setAllKeys(keys);
    
    // Buscar draft específico
    const quantumDraftKey = `quantum_draft_data_${session.user.email}`;
    const draftStr = localStorage.getItem(quantumDraftKey);
    
    if (draftStr) {
      try {
        setDraftData(JSON.parse(draftStr));
      } catch (e) {
        console.error('Error parseando draft:', e);
      }
    }
  }, [session]);
  
  const handleClear = () => {
    if (!session?.user?.email) return;
    const quantumDraftKey = `quantum_draft_data_${session.user.email}`;
    localStorage.removeItem(quantumDraftKey);
    localStorage.removeItem('quantum-carta-draft');
    setDraftData(null);
    alert('Draft eliminado');
  };
  
  const handleCreateTest = () => {
    if (!session?.user?.email) return;
    
    const testData = {
      cartaData: {
        relaciones: {
          declaracion: "Yo soy conexión genuina",
          objetivo: "Fortalecer relaciones familiares",
          acciones: [
            {
              nombre: "Llamadas de calidad con familiares",
              frecuencia: "Diaria",
              dias: []
            }
          ]
        },
        salud: {
          declaracion: "Yo soy energía vital",
          objetivo: "Alcanzar peso ideal",
          acciones: [
            {
              nombre: "Caminar 30 minutos",
              frecuencia: "Diaria",
              dias: []
            }
          ]
        },
        transformacion: {
          declaracion: "Yo soy impacto positivo",
          objetivo: "Enrolar a 4 personas",
          acciones: []
        },
        comunidad: {
          declaracion: "Yo soy contribución generosa",
          objetivo: "Participar en 3 proyectos comunitarios",
          acciones: [
            {
              nombre: "Asistir a juntas vecinales",
              frecuencia: "Personalizada",
              dias: ["Sábado"]
            }
          ]
        }
      },
      areasDisponibles: ['Relaciones', 'Salud', 'Servicio Transformacional', 'Servicio Comunitario'],
      timestamp: new Date().toISOString(),
      source: 'quantum',
      userEmail: session.user.email
    };
    
    const quantumDraftKey = `quantum_draft_data_${session.user.email}`;
    localStorage.setItem(quantumDraftKey, JSON.stringify(testData));
    setDraftData(testData);
    alert('Draft de prueba creado');
  };
  
  if (!session) {
    return <div className="p-8">Cargando sesión...</div>;
  }
  
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">🔬 Test Quantum Draft</h1>
      
      <div className="bg-gray-100 p-4 rounded mb-4">
        <p><strong>Usuario:</strong> {session.user.email}</p>
        <p><strong>Key esperada:</strong> quantum_draft_data_{session.user.email}</p>
      </div>
      
      <div className="mb-6 space-x-4">
        <button 
          onClick={handleCreateTest}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Crear Draft de Prueba
        </button>
        <button 
          onClick={handleClear}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          Limpiar Draft
        </button>
        <button 
          onClick={() => window.location.href = '/dashboard/carta/wizard-v2'}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        >
          Ir al Wizard
        </button>
      </div>
      
      <div className="bg-white border rounded p-4 mb-4">
        <h2 className="text-xl font-semibold mb-2">📋 Keys en localStorage:</h2>
        <ul className="list-disc pl-6 text-sm">
          {allKeys.length === 0 ? (
            <li className="text-gray-500">No hay keys en localStorage</li>
          ) : (
            allKeys.map(key => (
              <li key={key} className={key.includes('quantum') ? 'font-bold text-blue-600' : ''}>
                {key}
              </li>
            ))
          )}
        </ul>
      </div>
      
      <div className="bg-white border rounded p-4">
        <h2 className="text-xl font-semibold mb-2">📦 Draft Actual:</h2>
        {draftData ? (
          <pre className="text-xs overflow-auto max-h-96 bg-gray-50 p-4 rounded">
            {JSON.stringify(draftData, null, 2)}
          </pre>
        ) : (
          <p className="text-gray-500">No hay draft guardado</p>
        )}
      </div>
    </div>
  );
}
