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
      <div className={`${sizeClasses[size]} relative flex items-center justify-center`}>
        {/* Video del logo animado */}
        <video 
          autoPlay 
          loop 
          muted 
          playsInline
          className="w-full h-full object-contain mix-blend-screen"
        >
          <source src="/videos/logo-loading.mp4" type="video/mp4" />
        </video>
      </div>
      
      {message && (
        <p className="mt-6 text-lg sm:text-xl md:text-2xl text-cyan-300 font-medium tracking-wide">{message}</p>
      )}
    </div>
  );
}
