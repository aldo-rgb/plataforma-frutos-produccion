// Traducciones para el sistema multi-nivel
export const multiLevelTranslations = {
  es: {
    // Niveles
    levels: {
      BASIC: 'Discovery (Básico)',
      ADVANCED: 'Breakthrough (Avanzado)',
      PL: 'Quantum Leap (Liderato)',
    },
    levelDescriptions: {
      BASIC: 'Control de accesos, Pagos, Staff logístico',
      ADVANCED: 'Logística compleja, asignación de Buddies',
      PL: 'Mentores, Cartas F.R.U.T.O.S., Gamificación, App Móvil',
    },
    levelIcons: {
      BASIC: '🟦',
      ADVANCED: '🟪',
      PL: '🟨',
    },
    
    // Estados de estudiantes
    studentStatus: {
      BASIC_STUDENT: 'Estudiante Discovery',
      ADVANCED_CANDIDATE: 'Candidato Breakthrough',
      ADVANCED_STUDENT: 'Estudiante Breakthrough',
      PL_CANDIDATE: 'Candidato Quantum Leap',
      PL_STUDENT: 'Estudiante Quantum Leap',
      ALUMNI: 'Graduado',
    },
    
    // Roles de coordinadores
    coordinatorRoles: {
      COORDINATOR_BASIC: 'Coordinador Discovery',
      COORDINATOR_ADVANCED: 'Coordinador Breakthrough',
      TRAINER: 'Coordinador Quantum Leap',
    },
    
    coordinatorDescriptions: {
      COORDINATOR_BASIC: 'Gestiona logística, pagos y asistencia del nivel básico',
      COORDINATOR_ADVANCED: 'Gestiona dinámicas y staff del nivel avanzado',
      COORDINATOR_PL: 'Gestiona mentores, cartas y métricas del liderato',
    },
    
    // Wizard de creación
    wizard: {
      title: '¿Qué arquitectura tendrá esta Visión?',
      selectLevels: 'Selecciona los niveles que deseas habilitar',
      continue: 'Continuar',
      back: 'Atrás',
      finish: 'Crear Visión',
      
      steps: {
        selectArchitecture: 'Selección de Arquitectura',
        configureFinances: 'Configuración Financiera',
        createTickets: 'Crear Productos/Tickets',
        assignStaff: 'Asignar Staff',
        review: 'Revisar y Confirmar',
      },
    },
    
    // Panel financiero
    finances: {
      title: 'Panel Financiero',
      connectStripe: 'Conectar con Stripe',
      stripeConnected: 'Stripe Conectado',
      platformFee: 'Comisión de Plataforma',
      totalRevenue: 'Ingresos Totales',
      pendingPayouts: 'Pagos Pendientes',
      
      createTicket: 'Crear Ticket/Producto',
      ticketName: 'Nombre del Ticket',
      ticketPrice: 'Precio',
      ticketCapacity: 'Cupo',
      ticketLevel: 'Nivel',
      ticketDescription: 'Descripción',
      
      cashPayments: 'Pagos en Efectivo',
      generateCode: 'Generar Código',
      codeGenerated: 'Código generado exitosamente',
      codeAmount: 'Monto recibido',
    },
    
    // Dashboards por coordinador
    dashboards: {
      basic: {
        title: 'Dashboard Discovery',
        attendance: 'Control de Asistencia',
        scanQR: 'Escanear QR',
        takePhoto: 'Tomar Foto',
        payments: 'Pagos',
        generateAccessCode: 'Generar Código de Acceso',
        registrations: 'Registros',
        backlog: 'Backlog',
        drops: 'Abandonos',
      },
      
      advanced: {
        title: 'Dashboard Breakthrough',
        dynamics: 'Dinámicas',
        staff: 'Staff',
        captains: 'Capitanes',
        teams: 'Equipos',
        assignTeams: 'Asignar Equipos',
        buddies: 'Asignación de Buddies',
      },
      
      pl: {
        title: 'Dashboard Quantum Leap',
        mentors: 'Mentores',
        letters: 'Cartas F.R.U.T.O.S.',
        metrics: 'Métricas',
        gamification: 'Gamificación',
        strikes: 'Strikes',
        points: 'Puntos Cuánticos',
      },
    },
    
    // Graduaciones
    graduation: {
      title: 'Graduación de Estudiante',
      confirmGraduation: '¿Confirmar graduación?',
      studentName: 'Estudiante',
      fromLevel: 'De nivel',
      toLevel: 'A nivel',
      notes: 'Notas',
      graduate: 'Graduar',
      graduationSuccess: 'Estudiante graduado exitosamente',
      
      notifications: {
        graduated: 'Has sido graduado del nivel {{level}}',
        nextLevel: 'Ahora puedes acceder al nivel {{level}}',
      },
    },
    
    // Mensajes
    messages: {
      levelLocked: 'Este nivel está bloqueado. Completa el nivel anterior para desbloquearlo.',
      graduationRequired: 'Necesitas ser graduado por tu coordinador para acceder a este nivel.',
      paymentRequired: 'Realiza el pago para acceder a este nivel.',
      accessGranted: 'Acceso concedido al nivel {{level}}',
    },
  },
  
  en: {
    // Levels
    levels: {
      BASIC: 'Discovery (Basic)',
      ADVANCED: 'Breakthrough (Advanced)',
      PL: 'Quantum Leap (Leadership)',
    },
    levelDescriptions: {
      BASIC: 'Access control, Payments, Logistics staff',
      ADVANCED: 'Complex logistics, Buddy assignment',
      PL: 'Mentors, F.R.U.T.O.S. Letters, Gamification, Mobile App',
    },
    levelIcons: {
      BASIC: '🟦',
      ADVANCED: '🟪',
      PL: '🟨',
    },
    
    // Student statuses
    studentStatus: {
      BASIC_STUDENT: 'Discovery Student',
      ADVANCED_CANDIDATE: 'Breakthrough Candidate',
      ADVANCED_STUDENT: 'Breakthrough Student',
      PL_CANDIDATE: 'Quantum Leap Candidate',
      PL_STUDENT: 'Quantum Leap Student',
      ALUMNI: 'Alumni',
    },
    
    // Coordinator roles
    coordinatorRoles: {
      COORDINATOR_BASIC: 'Discovery Coordinator',
      COORDINATOR_ADVANCED: 'Breakthrough Coordinator',
      TRAINER: 'Quantum Leap Coordinator',
    },
    
    coordinatorDescriptions: {
      COORDINATOR_BASIC: 'Manages logistics, payments and attendance for basic level',
      COORDINATOR_ADVANCED: 'Manages dynamics and staff for advanced level',
      COORDINATOR_PL: 'Manages mentors, letters and metrics for leadership',
    },
    
    // Creation wizard
    wizard: {
      title: 'What architecture will this Vision have?',
      selectLevels: 'Select the levels you want to enable',
      continue: 'Continue',
      back: 'Back',
      finish: 'Create Vision',
      
      steps: {
        selectArchitecture: 'Architecture Selection',
        configureFinances: 'Financial Configuration',
        createTickets: 'Create Products/Tickets',
        assignStaff: 'Assign Staff',
        review: 'Review and Confirm',
      },
    },
    
    // Financial panel
    finances: {
      title: 'Financial Panel',
      connectStripe: 'Connect with Stripe',
      stripeConnected: 'Stripe Connected',
      platformFee: 'Platform Fee',
      totalRevenue: 'Total Revenue',
      pendingPayouts: 'Pending Payouts',
      
      createTicket: 'Create Ticket/Product',
      ticketName: 'Ticket Name',
      ticketPrice: 'Price',
      ticketCapacity: 'Capacity',
      ticketLevel: 'Level',
      ticketDescription: 'Description',
      
      cashPayments: 'Cash Payments',
      generateCode: 'Generate Code',
      codeGenerated: 'Code generated successfully',
      codeAmount: 'Amount received',
    },
    
    // Dashboards by coordinator
    dashboards: {
      basic: {
        title: 'Discovery Dashboard',
        attendance: 'Attendance Control',
        scanQR: 'Scan QR',
        takePhoto: 'Take Photo',
        payments: 'Payments',
        generateAccessCode: 'Generate Access Code',
        registrations: 'Registrations',
        backlog: 'Backlog',
        drops: 'Drops',
      },
      
      advanced: {
        title: 'Breakthrough Dashboard',
        dynamics: 'Dynamics',
        staff: 'Staff',
        captains: 'Captains',
        teams: 'Teams',
        assignTeams: 'Assign Teams',
        buddies: 'Buddy Assignment',
      },
      
      pl: {
        title: 'Quantum Leap Dashboard',
        mentors: 'Mentors',
        letters: 'F.R.U.T.O.S. Letters',
        metrics: 'Metrics',
        gamification: 'Gamification',
        strikes: 'Strikes',
        points: 'Quantum Points',
      },
    },
    
    // Graduations
    graduation: {
      title: 'Student Graduation',
      confirmGraduation: 'Confirm graduation?',
      studentName: 'Student',
      fromLevel: 'From level',
      toLevel: 'To level',
      notes: 'Notes',
      graduate: 'Graduate',
      graduationSuccess: 'Student graduated successfully',
      
      notifications: {
        graduated: 'You have graduated from {{level}} level',
        nextLevel: 'You can now access {{level}} level',
      },
    },
    
    // Messages
    messages: {
      levelLocked: 'This level is locked. Complete the previous level to unlock it.',
      graduationRequired: 'You need to be graduated by your coordinator to access this level.',
      paymentRequired: 'Make payment to access this level.',
      accessGranted: 'Access granted to {{level}} level',
    },
  },
};

// Hook para usar las traducciones
export function useMultiLevelTranslations(locale: 'es' | 'en' = 'es') {
  return multiLevelTranslations[locale];
}
