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
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32'
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className={`${sizeClasses[size]} relative`}>
        <div className="absolute inset-0 rounded-full border-4 border-purple-200 border-t-purple-600 animate-spin"></div>
        <div className="absolute inset-2 rounded-full border-4 border-purple-100 border-t-purple-400 animate-spin animation-delay-150" style={{ animationDirection: 'reverse' }}></div>
      </div>
      {message && (
        <p className="mt-4 text-purple-600 dark:text-purple-300 animate-pulse font-medium">{message}</p>
      )}
    </div>
  );
}
