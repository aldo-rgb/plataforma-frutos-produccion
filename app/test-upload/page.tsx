'use client';

import { useState } from 'react';

export default function TestUploadPage() {
  const [status, setStatus] = useState('Esperando...');
  const [imageUrl, setImageUrl] = useState('');

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setStatus('onChange disparado!');
    
    const file = e.target.files?.[0];
    if (!file) {
      setStatus('No hay archivo en el evento');
      return;
    }

    setStatus(`Archivo seleccionado: ${file.name} (${file.size} bytes)`);

    // Intentar subir
    try {
      setStatus(`Subiendo ${file.name}...`);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'test');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      
      if (data.success) {
        setStatus(`✅ Subido exitosamente!`);
        setImageUrl(data.url);
      } else {
        setStatus(`❌ Error: ${data.error}`);
      }
    } catch (err) {
      setStatus(`❌ Error de red: ${err}`);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-2xl mb-8">Test de Upload - Android</h1>
      
      {/* Status */}
      <div className="mb-6 p-4 bg-yellow-500/20 rounded-lg">
        <p className="text-yellow-400 font-mono text-sm">{status}</p>
      </div>

      {/* Opción 1: Sin accept */}
      <div className="mb-6 p-4 bg-gray-800 rounded-lg">
        <label className="block mb-2 text-gray-400">1. Sin accept (cualquier archivo):</label>
        <input
          type="file"
          onChange={handleChange}
          className="block w-full text-white"
        />
      </div>

      {/* Opción 2: accept image/* sin capture */}
      <div className="mb-6 p-4 bg-gray-800 rounded-lg">
        <label className="block mb-2 text-gray-400">2. accept=image/* (galería):</label>
        <input
          type="file"
          accept="image/*"
          onChange={handleChange}
          className="block w-full text-white"
        />
      </div>

      {/* Opción 3: accept con capture=environment (cámara trasera) */}
      <div className="mb-6 p-4 bg-gray-800 rounded-lg">
        <label className="block mb-2 text-gray-400">3. capture=environment (cámara trasera):</label>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleChange}
          className="block w-full text-white"
        />
      </div>

      {/* Opción 4: accept con capture=user (cámara frontal) */}
      <div className="mb-6 p-4 bg-gray-800 rounded-lg">
        <label className="block mb-2 text-gray-400">4. capture=user (cámara frontal):</label>
        <input
          type="file"
          accept="image/*"
          capture="user"
          onChange={handleChange}
          className="block w-full text-white"
        />
      </div>

      {/* Opción 5: accept específico */}
      <div className="mb-6 p-4 bg-gray-800 rounded-lg">
        <label className="block mb-2 text-gray-400">5. accept=.jpg,.jpeg,.png,.gif:</label>
        <input
          type="file"
          accept=".jpg,.jpeg,.png,.gif,.webp"
          onChange={handleChange}
          className="block w-full text-white"
        />
      </div>

      {/* Imagen subida */}
      {imageUrl && (
        <div className="mt-6 p-4 bg-green-900/30 rounded-lg">
          <p className="text-green-400 mb-2">✅ Imagen subida:</p>
          <img src={imageUrl} alt="Uploaded" className="max-w-xs rounded-lg" />
        </div>
      )}
    </div>
  );
}
