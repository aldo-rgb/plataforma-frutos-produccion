/**
 * QUANTUM COMMAND CENTER - Design System
 * 
 * Paleta de colores inspirada en "Bioluminiscencia en el Vacío"
 * Dark Mode Permanente con efectos de Glassmorphism y Neon Glow
 */

export const quantumTheme = {
  colors: {
    // 🌑 Fondo (Deep Void Blue)
    background: {
      primary: '#050B14',      // Azul oscuro casi negro - Background principal
      secondary: '#0A1628',    // Variación más clara para cards
      tertiary: '#0F1E33',     // Para elementos elevados
    },

    // 💠 Luz Primaria (Quantum Cyan)
    quantum: {
      50: '#E0F9FF',
      100: '#B8F1FF',
      200: '#8BE9FF',
      300: '#5EE1FF',
      400: '#31D9FF',
      500: '#00F0FF',          // Color principal - Quantum Cyan
      600: '#00C7D9',
      700: '#009EB3',
      800: '#00768C',
      900: '#004D66',
    },

    // 🏆 Luz de Logro (Legendary Gold)
    legendary: {
      50: '#FFF9E6',
      100: '#FFF0B8',
      200: '#FFE78A',
      300: '#FFDE5C',
      400: '#FFD72E',
      500: '#FFD700',          // Color principal - Legendary Gold
      600: '#D9B500',
      700: '#B39300',
      800: '#8C7100',
      900: '#664F00',
    },

    // 🔮 Luz de Magia (AI Purple)
    magic: {
      50: '#F5EEFF',
      100: '#E4D0FF',
      200: '#D3B1FF',
      300: '#C293FF',
      400: '#B174FF',
      500: '#9D4EDD',          // Color principal - AI Purple
      600: '#7F3EB3',
      700: '#612E8C',
      800: '#431F66',
      900: '#250F40',
    },

    // ⚠️ Luz de Urgencia (Alarm Red/Amber)
    alarm: {
      red: '#FF3366',
      amber: '#FFA500',
      orange: '#FF6B35',
    },

    // Grises y Neutrales
    slate: {
      50: '#F8FAFC',
      100: '#F1F5F9',
      200: '#E2E8F0',
      300: '#CBD5E1',
      400: '#94A3B8',
      500: '#64748B',
      600: '#475569',
      700: '#334155',
      800: '#1E293B',
      900: '#0F172A',
      950: '#020617',
    },

    // Estados
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6',
  },

  // 💎 Efectos de Glassmorphism
  glass: {
    light: 'rgba(255, 255, 255, 0.05)',
    medium: 'rgba(255, 255, 255, 0.1)',
    heavy: 'rgba(255, 255, 255, 0.15)',
    backdrop: 'blur(12px)',
  },

  // ✨ Efectos de Glow/Neon
  glow: {
    quantum: '0 0 20px rgba(0, 240, 255, 0.5), 0 0 40px rgba(0, 240, 255, 0.3)',
    legendary: '0 0 20px rgba(255, 215, 0, 0.5), 0 0 40px rgba(255, 215, 0, 0.3)',
    magic: '0 0 20px rgba(157, 78, 221, 0.5), 0 0 40px rgba(157, 78, 221, 0.3)',
    alarm: '0 0 20px rgba(255, 51, 102, 0.5), 0 0 40px rgba(255, 51, 102, 0.3)',
    subtle: '0 0 10px rgba(0, 240, 255, 0.2)',
  },

  // 📐 Bordes
  borders: {
    thin: '1px',
    medium: '2px',
    thick: '3px',
    radius: {
      sm: '0.375rem',    // 6px
      md: '0.5rem',      // 8px
      lg: '0.75rem',     // 12px
      xl: '1rem',        // 16px
      '2xl': '1.5rem',   // 24px
      full: '9999px',
    },
  },

  // 🔢 Tipografía
  typography: {
    // Fuentes geométricas para títulos
    heading: {
      fontFamily: '"Orbitron", "Montserrat", system-ui, sans-serif',
      weights: {
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
        black: 900,
      },
    },
    // Fuente normal para texto
    body: {
      fontFamily: '"Inter", system-ui, sans-serif',
      weights: {
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
      },
    },
    // Fuente monospace para datos/números
    mono: {
      fontFamily: '"JetBrains Mono", "Fira Code", monospace',
      weights: {
        normal: 400,
        medium: 500,
        bold: 700,
      },
    },
  },

  // 🎭 Animaciones
  animations: {
    duration: {
      fast: '150ms',
      normal: '300ms',
      slow: '500ms',
    },
    easing: {
      smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
      bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
    },
  },

  // 📏 Espaciado
  spacing: {
    xs: '0.25rem',    // 4px
    sm: '0.5rem',     // 8px
    md: '1rem',       // 16px
    lg: '1.5rem',     // 24px
    xl: '2rem',       // 32px
    '2xl': '3rem',    // 48px
    '3xl': '4rem',    // 64px
  },

  // 🎨 Componentes específicos
  components: {
    card: {
      background: 'rgba(15, 30, 51, 0.6)',
      border: 'rgba(0, 240, 255, 0.2)',
      hover: 'rgba(15, 30, 51, 0.8)',
    },
    button: {
      primary: {
        background: 'linear-gradient(135deg, #00F0FF 0%, #0099CC 100%)',
        hover: 'linear-gradient(135deg, #00F0FF 0%, #00C7D9 100%)',
        text: '#050B14',
      },
      secondary: {
        background: 'rgba(0, 240, 255, 0.1)',
        hover: 'rgba(0, 240, 255, 0.2)',
        text: '#00F0FF',
      },
      legendary: {
        background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
        hover: 'linear-gradient(135deg, #FFD700 0%, #FFB800 100%)',
        text: '#050B14',
      },
    },
    input: {
      background: 'rgba(10, 22, 40, 0.8)',
      border: 'rgba(0, 240, 255, 0.3)',
      focus: 'rgba(0, 240, 255, 0.6)',
      text: '#E2E8F0',
      placeholder: '#64748B',
    },
  },
} as const;

export type QuantumTheme = typeof quantumTheme;

// Helper para generar clases de Tailwind con el theme
export const tw = {
  bgPrimary: 'bg-[#050B14]',
  bgSecondary: 'bg-[#0A1628]',
  bgTertiary: 'bg-[#0F1E33]',
  
  textQuantum: 'text-[#00F0FF]',
  textLegendary: 'text-[#FFD700]',
  textMagic: 'text-[#9D4EDD]',
  
  borderQuantum: 'border-[#00F0FF]/20',
  borderLegendary: 'border-[#FFD700]/20',
  
  glowQuantum: 'shadow-[0_0_20px_rgba(0,240,255,0.5)]',
  glowLegendary: 'shadow-[0_0_20px_rgba(255,215,0,0.5)]',
  glowMagic: 'shadow-[0_0_20px_rgba(157,78,221,0.5)]',
};
