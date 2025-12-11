# 🎯 Plataforma Impacto Cuántico

Sistema de gestión de alto rendimiento personal basado en el método F.R.U.T.O.S. (Finanzas, Relaciones, Utilización de Talentos, Ocio, Salud, Servicio a la Comunidad y Transformación Personal, Enrolamiento).

## ✨ Características Principales

### Para Líderes
- **Carta F.R.U.T.O.S.**: Define 8 metas cuantificables con IA o manualmente
- **Programación Inteligente**: Sistema de días con validación y calendario
- **Evidencias Fotográficas**: Sube y trackea tu progreso diario
- **Ranking por Visión**: Compite con líderes de tu misma visión
- **Metas Extraordinarias**: Recibe retos especiales con recompensas extra
- **Puntos Cuánticos**: Gana puntos por completar tareas y canjéalos

### Para Staff (Coordinadores/Mentores)
- **Bandeja de Evidencias**: Revisa y aprueba evidencias de líderes
- **Autorización de Cartas**: Valida cartas antes de activarlas
- **Metas Extraordinarias**: Asigna retos a visiones completas o jugadores individuales
- **Gestión de Usuarios**: Control de roles y permisos

### Características Técnicas
- ✅ **Protocolo S.M.A.R.T.**: Validación de metas específicas, medibles, alcanzables, relevantes y con tiempo
- ✅ **Detección Inteligente**: Parser que identifica frecuencias (diario, semanal, mensual)
- ✅ **Calendario Adaptativo**: Grid semanal o mensual según la frecuencia declarada
- ✅ **Auto-selección**: Días marcados automáticamente para tareas diarias
- ✅ **Validación de Cantidades**: Coincidencia exacta entre días declarados y seleccionados
- ✅ **Flujo Secuencial**: Programación automática de todas las tareas
- ✅ **Modo Edición**: Re-programa días después de guardar

## 🚀 Tech Stack

- **Frontend**: Next.js 16 + React 19 + TypeScript
- **Styling**: Tailwind CSS + Lucide Icons
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL (Neon)
- **ORM**: Prisma
- **IA**: OpenAI GPT-4 para generación de metas

## 📦 Instalación

### Prerrequisitos
- Node.js 18+ 
- npm o pnpm
- Cuenta en [Neon](https://neon.tech) para PostgreSQL
- API Key de [OpenAI](https://platform.openai.com)

### Pasos

1. **Clonar el repositorio**
```bash
git clone https://github.com/TU_USUARIO/plataforma-impacto-cuantico.git
cd plataforma-impacto-cuantico
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**

Crea un archivo `.env.local` con:
```env
DATABASE_URL="postgresql://user:password@host/database?sslmode=require"
OPENAI_API_KEY="sk-proj-..."
```

4. **Sincronizar base de datos**
```bash
npx prisma db push
npx prisma generate
```

5. **Ejecutar en desarrollo**
```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

## 🗄️ Estructura del Proyecto

```
plataforma-frutos/
├── app/
│   ├── api/                  # API Routes
│   │   ├── carta/           # CRUD de Carta F.R.U.T.O.S.
│   │   ├── evidencias/      # Gestión de evidencias
│   │   ├── ranking/         # Sistema de puntos
│   │   ├── metas-extraordinarias/  # Retos especiales
│   │   └── user/            # Perfil y autenticación
│   ├── dashboard/           # Páginas del dashboard
│   │   ├── bienvenida/      # Onboarding
│   │   ├── carta/           # Editor de Carta F.R.U.T.O.S.
│   │   ├── progreso/        # Análisis de avance
│   │   ├── ranking/         # Leaderboard por visión
│   │   ├── metas-extraordinarias/  # Panel de coordinador
│   │   ├── revision-evidencias/    # Aprobación de evidencias
│   │   └── staff/           # Autorización de cartas
│   └── layout.tsx           # Layout principal con navegación
├── components/              # Componentes reutilizables
├── prisma/
│   └── schema.prisma        # Modelo de datos
├── utils/                   # Utilidades
└── public/                  # Assets estáticos
```

## 🎨 Modelo F.R.U.T.O.S.

| Categoría | Descripción |
|-----------|-------------|
| 🏦 **Finanzas** | Metas de ingresos, ahorro, inversión |
| 💑 **Relaciones** | Familia, pareja, amistades |
| 🎯 **Utilización de Talentos** | Desarrollo de habilidades |
| 🧘 **Paz Mental** | Meditación, mindfulness, terapia |
| 🎮 **Ocio** | Hobbies, entretenimiento, descanso |
| 💪 **Salud** | Ejercicio, nutrición, sueño |
| 🤝 **Servicio a la Comunidad** | Voluntariado, impacto social |
| 📢 **Enrolamiento** | Invitar nuevos participantes |

## 👥 Roles del Sistema

- **LIDER**: Usuario base, gestiona su propia carta
- **MENTOR**: Puede revisar evidencias y guiar líderes
- **COORDINADOR**: Autoriza cartas y crea metas extraordinarias
- **GAME_CHANGER**: Acceso completo al sistema

## 🔐 Seguridad

- ✅ Variables de entorno protegidas con `.env.local`
- ✅ Base de datos con SSL/TLS (Neon)
- ✅ Roles y permisos por endpoint
- ✅ Validación de datos en cliente y servidor

## 🚀 Despliegue en Vercel

1. **Conecta tu repositorio**
   - Ve a [vercel.com](https://vercel.com)
   - Importa tu repositorio de GitHub

2. **Configura variables de entorno**
   - Agrega `DATABASE_URL` y `OPENAI_API_KEY` en Vercel

3. **Despliega**
   - Vercel detectará Next.js automáticamente
   - Build y despliegue en minutos

## 📝 Scripts Disponibles

```bash
npm run dev          # Desarrollo
npm run build        # Build de producción
npm run start        # Servidor de producción
npm run lint         # Linter
npx prisma studio    # UI de base de datos
npx prisma db push   # Sincronizar schema
```

## 🤝 Contribución

1. Fork el proyecto
2. Crea tu feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'feat: Add AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto es privado y confidencial.

## 🙏 Créditos

Desarrollado para el programa **Impacto Cuántico** de transformación personal.

---

**¿Necesitas ayuda?** Contacta al equipo de soporte.
