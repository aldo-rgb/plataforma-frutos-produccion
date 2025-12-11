'use client';

import { useState, useRef } from 'react';
import { ArrowLeft, Package, Plus, Edit3, Trash2, Save, X, Image as ImageIcon, Search, ShoppingBag, DollarSign, Coins, UploadCloud, XCircle } from 'lucide-react';
import Link from 'next/link';

// --- MOCK DATA: INVENTARIO ---
const PRODUCTOS_INICIALES = [
  { id: 1, nombre: 'Sesión de Coaching Extra', descripcion: '45 min con un Mentor Senior.', puntos: 500, precioMXN: 1000, stock: 10, imagen: 'https://via.placeholder.com/150/blue' },
  { id: 2, nombre: 'Libro: Hábitos Atómicos', descripcion: 'Best seller de James Clear (Físico).', puntos: 300, precioMXN: 450, stock: 5, imagen: 'https://via.placeholder.com/150/orange' },
  { id: 3, nombre: 'Kit de Bienvenida VIP', descripcion: 'Termo, Libreta y Pluma oficial.', puntos: 800, precioMXN: 1200, stock: 20, imagen: 'https://via.placeholder.com/150/purple' },
];

export default function AdminProductosPage() {
  const [productos, setProductos] = useState(PRODUCTOS_INICIALES);
  const [busqueda, setBusqueda] = useState('');
  
  // Estado del Formulario
  const [mostrarForm, setMostrarForm] = useState(false);
  const [productoEditando, setProductoEditando] = useState<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Estado para el archivo físico (Simulación de upload)
  const [fileSeleccionado, setFileSeleccionado] = useState<File | null>(null);
  
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    puntos: 0,
    precioMXN: 0, // Nuevo campo
    stock: 0,
    imagen: ''
  });

  // Formateador de moneda
  const formatoMXN = (cantidad: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(cantidad);
  };

  // ABRIR FORMULARIO
  const abrirFormulario = (producto?: any) => {
    setFileSeleccionado(null); // Reset del archivo
    if (producto) {
      setProductoEditando(producto);
      setFormData(producto);
    } else {
      setProductoEditando(null);
      setFormData({ nombre: '', descripcion: '', puntos: 0, precioMXN: 0, stock: 0, imagen: '' });
    }
    setMostrarForm(true);
  };

  // --- MANEJO DE IMAGEN (NUEVO) ---
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        setFileSeleccionado(file);
        // Creamos una URL local temporal para previsualizar
        const previewUrl = URL.createObjectURL(file);
        setFormData({ ...formData, imagen: previewUrl });
    }
  };

  const removerImagen = () => {
      setFileSeleccionado(null);
      setFormData({ ...formData, imagen: '' });
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // GUARDAR (CREAR O ACTUALIZAR)
  const handleGuardar = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (productoEditando) {
      // Editar existente
      setProductos(prev => prev.map(p => p.id === productoEditando.id ? { ...formData, id: p.id } : p));
    } else {
      // Crear nuevo
      const nuevoId = Math.max(...productos.map(p => p.id), 0) + 1;
      setProductos(prev => [...prev, { ...formData, id: nuevoId }]);
    }
    setMostrarForm(false);
  };

  // ELIMINAR
  const handleEliminar = (id: number) => {
    if (confirm('¿Seguro que deseas eliminar este premio?')) {
      setProductos(prev => prev.filter(p => p.id !== id));
    }
  };

  // FILTRADO
  const productosFiltrados = productos.filter(p => 
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto relative min-h-screen">
      
      {/* HEADER */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <Link href="/dashboard" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-2">
                <ArrowLeft size={20} /> Volver al Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Package className="text-purple-500" size={32} /> Catálogo de Recompensas
            </h1>
        </div>
        <button onClick={() => abrirFormulario()} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-all shadow-lg">
          <Plus size={20} /> Nuevo Producto
        </button>
      </div>

      {/* BARRA DE BÚSQUEDA */}
      <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 mb-6 flex items-center gap-3">
        <Search className="text-slate-500" size={20} />
        <input type="text" placeholder="Buscar producto..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="bg-transparent border-none focus:outline-none text-white w-full placeholder-slate-500"/>
      </div>

      {/* --- TABLA DE PRODUCTOS --- */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-950 text-slate-400 text-xs uppercase tracking-wider">
                        <th className="p-4">Producto</th>
                        <th className="p-4">Descripción</th>
                        <th className="p-4 text-center">Valor Puntos</th>
                        <th className="p-4 text-center">Valor MXN</th>
                        <th className="p-4 text-center">Stock</th>
                        <th className="p-4 text-right">Acciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                    {productosFiltrados.map((prod) => (
                        <tr key={prod.id} className="hover:bg-slate-800/50 transition-colors group">
                            <td className="p-4 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-700">
                                    {prod.imagen ? (
                                        <img src={prod.imagen} alt={prod.nombre} className="w-full h-full object-cover" />
                                    ) : (
                                        <ShoppingBag size={20} className="text-slate-500" />
                                    )}
                                </div>
                                <span className="font-bold text-white">{prod.nombre}</span>
                            </td>
                            <td className="p-4 text-slate-400 text-sm max-w-xs truncate">{prod.descripcion}</td>
                            
                            {/* COLUMNA PUNTOS */}
                            <td className="p-4 text-center">
                                <div className="flex items-center justify-center gap-1 font-bold text-blue-400 bg-blue-900/10 px-2 py-1 rounded w-fit mx-auto">
                                    <Coins size={14} />
                                    <span>{prod.puntos} QP</span>
                                </div>
                            </td>

                            {/* COLUMNA DINERO */}
                            <td className="p-4 text-center">
                                <div className="flex items-center justify-center gap-1 font-bold text-emerald-400 bg-emerald-900/10 px-2 py-1 rounded w-fit mx-auto">
                                    <DollarSign size={14} />
                                    <span>{formatoMXN(prod.precioMXN)}</span>
                                </div>
                            </td>

                            <td className="p-4 text-center">
                                <span className={`font-bold px-2 py-1 rounded text-xs ${prod.stock > 0 ? 'text-slate-300 bg-slate-800' : 'text-red-400 bg-red-900/10'}`}>
                                    {prod.stock} un.
                                </span>
                            </td>
                            <td className="p-4 text-right">
                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => abrirFormulario(prod)} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white" title="Editar">
                                        <Edit3 size={18} />
                                    </button>
                                    <button onClick={() => handleEliminar(prod.id)} className="p-2 hover:bg-red-900/30 rounded-lg text-slate-400 hover:text-red-400" title="Eliminar">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                    {productosFiltrados.length === 0 && (
                        <tr>
                            <td colSpan={5} className="p-8 text-center text-slate-500">
                                No se encontraron productos. ¡Agrega uno nuevo!
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {/* --- MODAL DE FORMULARIO --- */}
      {mostrarForm && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl relative animate-in fade-in zoom-in duration-200 my-8">
                
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        {productoEditando ? 'Editar Producto' : 'Nuevo Producto'}
                    </h2>
                    <button onClick={() => setMostrarForm(false)} className="text-slate-400 hover:text-white transition-colors"><X size={24} /></button>
                </div>

                <form onSubmit={handleGuardar} className="p-6 space-y-4">
                    
                    {/* --- SECCIÓN DE IMAGEN (NUEVA) --- */}
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Imagen del Producto</label>
                        
                        {/* Área de Carga / Previsualización */}
                        <div className="border-2 border-dashed border-slate-700 rounded-xl p-4 flex flex-col items-center justify-center bg-slate-950/50 hover:bg-slate-950 hover:border-blue-500/50 transition-all relative group">
                            
                            {formData.imagen ? (
                                // PREVISUALIZACIÓN
                                <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-slate-700 shadow-sm">
                                    <img src={formData.imagen} alt="Preview" className="w-full h-full object-cover" />
                                    <button 
                                        type="button"
                                        onClick={removerImagen}
                                        className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                        title="Remover imagen"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ) : (
                                // BOTÓN DE CARGA
                                <>
                                    <div className="p-3 bg-slate-800 rounded-full text-blue-500 mb-2 group-hover:scale-110 transition-transform">
                                        <UploadCloud size={24} />
                                    </div>
                                    <p className="text-sm text-slate-300 font-medium">Haz clic para subir imagen</p>
                                    <p className="text-xs text-slate-500">PNG, JPG (Máx. 2MB)</p>
                                </>
                            )}

                            {/* Input invisible */}
                            <input 
                                type="file" 
                                ref={fileInputRef}
                                onChange={handleImageChange}
                                accept="image/png, image/jpeg, image/jpg"
                                className={`absolute inset-0 w-full h-full opacity-0 cursor-pointer ${formData.imagen ? 'hidden' : ''}`}
                            />
                        </div>
                    </div>

                    {/* Campos de Texto */}
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nombre</label>
                        <input type="text" required value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:border-blue-500 focus:outline-none" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Descripción</label>
                        <textarea rows={2} required value={formData.descripcion} onChange={(e) => setFormData({...formData, descripcion: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:border-blue-500 focus:outline-none resize-none" />
                    </div>

                    {/* Precios y Stock */}
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-blue-400 uppercase mb-1">QP</label>
                            <input type="number" min="0" required value={formData.puntos} onChange={(e) => setFormData({...formData, puntos: Number(e.target.value)})} className="w-full bg-slate-800 border border-blue-900/50 rounded-lg p-3 text-white font-bold focus:border-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-emerald-400 uppercase mb-1">MXN</label>
                            <input type="number" min="0" required value={formData.precioMXN} onChange={(e) => setFormData({...formData, precioMXN: Number(e.target.value)})} className="w-full bg-slate-800 border border-emerald-900/50 rounded-lg p-3 text-white font-bold focus:border-emerald-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Stock</label>
                            <input type="number" min="0" required value={formData.stock} onChange={(e) => setFormData({...formData, stock: Number(e.target.value)})} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:border-slate-500 outline-none" />
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button type="button" onClick={() => setMostrarForm(false)} className="w-1/3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-lg transition-colors">Cancelar</button>
                        <button type="submit" className="w-2/3 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"><Save size={20} /> Guardar</button>
                    </div>
                </form>
            </div>
        </div>
      )}

    </div>
  );
}
