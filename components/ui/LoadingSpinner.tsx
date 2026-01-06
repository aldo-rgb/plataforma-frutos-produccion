interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function LoadingSpinner({ 
  message = 'Cargando...', 
  size = 'md',
  className = '' 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-32 h-32',
    md: 'w-48 h-48',
    lg: 'w-64 h-64'
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className={`${sizeClasses[size]} relative`}>
        {/* Anillo exterior - Blanco con gradiente azul/púrpura */}
        <div className="absolute inset-0 rounded-full border-[6px] border-transparent bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 animate-spin-slow" 
             style={{ 
               WebkitMaskImage: 'linear-gradient(white, white), linear-gradient(white, white)',
               WebkitMaskComposite: 'destination-out',
               maskComposite: 'exclude',
               animationDuration: '3s'
             }}>
        </div>
        
        {/* Anillo medio - Blanco sólido */}
        <div className="absolute inset-[15%] rounded-full border-[5px] border-white/90 animate-spin-reverse"
             style={{ animationDuration: '4s' }}>
        </div>
        
        {/* Anillo interior - Blanco sólido */}
        <div className="absolute inset-[30%] rounded-full border-[4px] border-white/80 animate-spin"
             style={{ animationDuration: '2.5s' }}>
        </div>
        
        {/* Esfera central con gradiente cuántico */}
        <div className="absolute inset-[35%] rounded-full bg-gradient-to-br from-blue-500 via-purple-600 to-pink-600 shadow-[0_0_60px_rgba(147,51,234,0.8)] animate-pulse-slow">
          <div className="absolute inset-[10%] rounded-full bg-gradient-to-tr from-cyan-400 via-blue-500 to-purple-600 opacity-80"></div>
          <div className="absolute inset-[25%] rounded-full bg-gradient-to-br from-white/40 to-transparent"></div>
        </div>
        
        {/* Brillo exterior */}
        <div className="absolute inset-[-20%] rounded-full bg-purple-500/20 blur-3xl animate-pulse-slow"></div>
      </div>
      
      {message && (
        <p className="mt-8 text-lg sm:text-xl md:text-2xl text-purple-300 font-medium tracking-wide">{message}</p>
      )}
      
      {/* Estilo personalizado para animaciones */}
      <style jsx>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes spin-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
        .animate-spin-reverse {
          animation: spin-reverse 4s linear infinite;
        }
        .animate-pulse-slow {
          animation: pulse-slow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
