'use client';

import { useState } from 'react';
import { ShoppingBag, ShoppingCart, Zap, Lock, X, Plus, Trash2, ChevronRight, CheckCircle2, AlertTriangle } from 'lucide-react';

// --- MOCK DATA: PRODUCTOS ---
const PRODUCTOS = [
  { id: 1, nombre: 'Sticker Holográfico', categoria: 'ACCESORIOS', rareza: 'COMUN', puntos: 100, imagen: '🏷️', descripcion: 'Adhesivo de alta calidad con el logo.' },
  { id: 2, nombre: 'Taza "Soy Fuente"', categoria: 'ACCESORIOS', rareza: 'RARO', puntos: 400, imagen: '☕', descripcion: 'Cerámica negra mate.' },
  { id: 3, nombre: 'Gorra Snapback', categoria: 'ROPA', rareza: 'RARO', puntos: 600, imagen: '🧢', descripcion: 'Estilo urbano bordado.' },
  { id: 4, nombre: 'Playera VIA Oficial', categoria: 'ROPA', rareza: 'EPICO', puntos: 800, imagen: '👕', descripcion: 'Tela tecnológica dry-fit.' },
  { id: 5, nombre: 'Libro Autografiado', categoria: 'EDUCACION', rareza: 'EPICO', puntos: 1200, imagen: '📖', descripcion: 'Edición especial firmada.' },
  { id: 6, nombre: 'Hoodie "Quantum"', categoria: 'ROPA', rareza: 'LEGENDARIO', puntos: 1500, imagen: '🧥', descripcion: 'Sudadera premium heavyweight.' },
  { id: 7, nombre: 'Sesión 1:1 Mentor', categoria: 'EXPERIENCIA', rareza: 'LEGENDARIO', puntos: 2500, imagen: '🧠', descripcion: '60 minutos privados.' },
  { id: 8, nombre: 'Cena con John Hanley', categoria: 'EXPERIENCIA', rareza: 'MITICO', puntos: 5000, imagen: '🍽️', descripcion: 'Experiencia exclusiva.' },
];

const CATEGORIAS = ['TODOS', 'ROPA', 'ACCESORIOS', 'EXPERIENCIA'];

export default function CanjearPuntosPage() {
  const [filtroCategoria, setFiltroCategoria] = useState('TODOS');
  const [misPuntos, setMisPuntos] = useState(6000); 
  
  // --- ESTADOS DEL CARRITO ---
  const [carrito, setCarrito] = useState<any[]>([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState<any | null>(null);
  const [mostrarCarrito, setMostrarCarrito] = useState(false);
  const [compraExitosa, setCompraExitosa] = useState(false);

  const totalCarrito = carrito.reduce((acc, item) => acc + item.puntos, 0);
  const saldoRestante = misPuntos - totalCarrito;
  const puedePagarCarrito = saldoRestante >= 0;

  // Funciones
  const agregarAlCarrito = (producto: any) => {
    if (carrito.find(item => item.id === producto.id)) {
        alert("Ya tienes este item en el carrito.");
        return;
    }
    setCarrito([...carrito, producto]);
    setProductoSeleccionado(null);
    setMostrarCarrito(true);
  };

  const eliminarDelCarrito = (id: number) => {
    setCarrito(carrito.filter(item => item.id !== id));
  };

  const realizarCompra = () => {
    if (!puedePagarCarrito) return;
    setMisPuntos(saldoRestante);
    setCarrito([]);
    setMostrarCarrito(false);
    setCompraExitosa(true);
    setTimeout(() => setCompraExitosa(false), 4000);
  };

  const productosFiltrados = PRODUCTOS.filter(p => 
    filtroCategoria === 'TODOS' ? true : p.categoria === filtroCategoria
  );

  const getRarezaColor = (rareza: string) => {
    switch (rareza) {
      case 'COMUN': return 'border-slate-600 text-slate-400 bg-slate-800';
      case 'RARO': return 'border-blue-500 text-blue-400 bg-blue-900/20';
      case 'EPICO': return 'border-purple-500 text-purple-400 bg-purple-900/20';
      case 'LEGENDARIO': return 'border-yellow-500 text-yellow-400 bg-yellow-900/20';
      case 'MITICO': return 'border-rose-500 text-rose-400 bg-rose-900/20';
      default: return 'border-slate-600';
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen relative">
      
      {/* NOTIFICACIÓN ÉXITO */}
      {compraExitosa && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] bg-green-500 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-bounce">
              <CheckCircle2 size={24} />
              <span className="font-bold">¡Canje realizado con éxito!</span>
          </div>
      )}

      {/* HEADER */}
      <div className="relative mb-8 rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 p-8 flex flex-col md:flex-row items-center justify-between shadow-2xl">
        <div className="relative z-10">
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
                <ShoppingBag className="text-blue-500" size={40} />
                Bóveda de Recompensas
            </h1>
            <p className="text-slate-400">Arma tu carrito de equipamiento.</p>
        </div>
        <div className="relative z-10 mt-6 md:mt-0 bg-slate-950 border border-yellow-500/30 p-4 rounded-xl flex items-center gap-4">
            <div className="p-3 bg-yellow-500 text-slate-900 rounded-lg"><Zap size={28} fill="currentColor" /></div>
            <div>
                <p className="text-slate-400 text-xs font-bold uppercase">Disponible</p>
                <p className="text-3xl font-bold text-white">{misPuntos.toLocaleString()} PC</p>
            </div>
        </div>
      </div>

      {/* FILTROS */}
      <div className="flex flex-wrap gap-2 mb-8 justify-center md:justify-start">
        {CATEGORIAS.map((cat) => (
            <button key={cat} onClick={() => setFiltroCategoria(cat)} className={`px-6 py-2 rounded-full text-xs font-bold transition-all border ${filtroCategoria === cat ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-900 text-slate-400 border-slate-700'}`}>
                {cat}
            </button>
        ))}
      </div>

      {/* GRID DE PRODUCTOS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pb-24">
        {productosFiltrados.map((prod) => {
            const alcanza = misPuntos >= prod.puntos;
            return (
                <div 
                    key={prod.id} 
                    onClick={() => setProductoSeleccionado(prod)}
                    className={`group relative bg-slate-900 rounded-xl border transition-all cursor-pointer overflow-hidden flex flex-col ${alcanza ? 'border-slate-800 hover:border-blue-500 hover:-translate-y-1' : 'border-slate-800 opacity-60'}`}
                >
                    <div className={`absolute top-3 left-3 z-20 px-2 py-1 rounded text-[10px] font-bold border uppercase ${getRarezaColor(prod.rareza)}`}>{prod.rareza}</div>
                    
                    <div className="h-40 bg-slate-950 flex items-center justify-center text-7xl group-hover:scale-110 transition-transform">
                        {prod.imagen}
                        {!alcanza && <div className="absolute inset-0 bg-slate-950/60 flex items-center justify-center"><Lock size={30} className="text-slate-500" /></div>}
                    </div>

                    <div className="p-4 flex-1 flex flex-col">
                        <h3 className="text-white font-bold mb-1">{prod.nombre}</h3>
                        <div className={`mt-auto flex justify-between items-center pt-3 border-t border-slate-800`}>
                            <div className="flex items-center gap-1 text-yellow-500 font-bold"><Zap size={14} fill="currentColor"/>{prod.puntos}</div>
                            {alcanza && <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded font-bold">VER</span>}
                        </div>
                    </div>
                </div>
            );
        })}
      </div>

      {/* BOTÓN FLOTANTE DEL CARRITO */}
      <button 
        onClick={() => setMostrarCarrito(true)}
        className="fixed bottom-8 right-8 z-40 bg-blue-600 hover:bg-blue-500 text-white p-4 rounded-full shadow-2xl shadow-blue-600/50 transition-transform hover:scale-110 flex items-center gap-2 border-2 border-slate-900"
      >
        <ShoppingCart size={28} />
        {carrito.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-slate-900 animate-bounce">
                {carrito.length}
            </span>
        )}
      </button>

      {/* MODAL DETALLE */}
      {productoSeleccionado && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
                <div className="p-6 bg-slate-950 flex justify-center text-8xl border-b border-slate-800 relative">
                    {productoSeleccionado.imagen}
                    <button onClick={() => setProductoSeleccionado(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X size={24}/></button>
                </div>
                <div className="p-6">
                    <h2 className="text-2xl font-bold text-white">{productoSeleccionado.nombre}</h2>
                    <p className="text-slate-400 text-sm mt-2 mb-6">{productoSeleccionado.descripcion}</p>
                    
                    <div className="flex justify-between items-center mb-6">
                         <span className="text-slate-500">Costo:</span>
                         <span className="text-yellow-500 font-bold text-xl flex items-center gap-2"><Zap size={20} fill="currentColor"/> {productoSeleccionado.puntos}</span>
                    </div>

                    <button 
                        onClick={() => agregarAlCarrito(productoSeleccionado)}
                        disabled={misPuntos < productoSeleccionado.puntos}
                        className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 ${misPuntos >= productoSeleccionado.puntos ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
                    >
                        {misPuntos >= productoSeleccionado.puntos ? <>AÑADIR AL CARRITO <Plus/></> : 'SALDO INSUFICIENTE'}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* DRAWER CARRITO */}
      {mostrarCarrito && (
        <>
            <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setMostrarCarrito(false)}></div>
            <div className="fixed top-0 right-0 z-50 h-full w-full max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl p-6 flex flex-col animate-in slide-in-from-right duration-300">
                <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2"><ShoppingCart className="text-blue-500"/> Tu Carrito</h2>
                    <button onClick={() => setMostrarCarrito(false)} className="text-slate-400 hover:text-white"><X size={24}/></button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4">
                    {carrito.length === 0 ? (
                        <div className="text-center text-slate-500 mt-20"><ShoppingBag size={48} className="mx-auto mb-4 opacity-50"/><p>Carrito vacío.</p></div>
                    ) : (
                        carrito.map((item, idx) => (
                            <div key={idx} className="flex gap-4 p-3 bg-slate-950 rounded-xl border border-slate-800 items-center">
                                <div className="text-3xl">{item.imagen}</div>
                                <div className="flex-1">
                                    <h4 className="text-white font-bold text-sm">{item.nombre}</h4>
                                    <div className="text-yellow-500 font-bold text-xs">{item.puntos} PC</div>
                                </div>
                                <button onClick={() => eliminarDelCarrito(item.id)} className="text-slate-500 hover:text-red-400"><Trash2 size={18}/></button>
                            </div>
                        ))
                    )}
                </div>

                <div className="mt-6 border-t border-slate-800 pt-6">
                    <div className="flex justify-between mb-4 text-xl text-white font-bold">
                        <span>Total:</span>
                        <span className="text-yellow-500">{totalCarrito} PC</span>
                    </div>
                    
                    {!puedePagarCarrito && <div className="mb-4 p-3 bg-red-900/20 text-red-400 text-xs rounded border border-red-900"><AlertTriangle size={14} className="inline mr-2"/>Saldo insuficiente.</div>}

                    <button 
                        onClick={realizarCompra}
                        disabled={carrito.length === 0 || !puedePagarCarrito}
                        className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 ${carrito.length > 0 && puedePagarCarrito ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-slate-800 text-slate-500'}`}
                    >
                        PAGAR AHORA <ChevronRight/>
                    </button>
                </div>
            </div>
        </>
      )}

    </div>
  );
}
