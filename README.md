# OGame Bot

Bot para gestionar tu cuenta de OGame con panel de control web y automatización inteligente.

## Características

- **Panel de Control Web** - Interfaz Angular moderna para monitorear y controlar el bot
- **Automatización con Playwright** - Control del navegador para interactuar con OGame
- **Scheduler de Tareas** - Sistema de tareas programadas con intervalos configurables
- **Maximización de Minas** - Algoritmo inteligente de construcción basado en ROI
- **Política Expansionista** - Sistema de colonización y exploración (en desarrollo)
- **Login Manual/Automático** - Soporte para ambos modos de autenticación

## Estructura del Proyecto

```
Ogame/
├── backend/                 # API Node.js + Express + Playwright
│   ├── src/
│   │   ├── api/            # Rutas de la API REST
│   │   ├── browser/        # Cliente OGame y gestión del navegador
│   │   ├── config/         # Configuración del servidor
│   │   ├── expansion/      # Módulo de política expansionista
│   │   ├── game/           # Fórmulas y lógica del juego
│   │   ├── mines/          # Módulo de maximización de minas
│   │   └── scheduler/      # Sistema de tareas programadas
│   └── .env.example        # Plantilla de configuración
├── frontend/               # Panel de control Angular 19
│   └── src/app/
│       ├── components/     # Componentes de la UI
│       ├── services/       # Servicios de comunicación con API
│       └── config/         # Feature flags
├── docs/                   # Documentación del proyecto
│   ├── OGAME_RULES.md      # Reglas y fórmulas del juego
│   ├── BUILDING_SELECTION_LOGIC.md  # Lógica de construcción
│   └── EXPANSION_POLICY.md # Estrategias de colonización
└── start.sh               # Script de inicio rápido
```

## Inicio Rápido

### Opción 1: Script de inicio (recomendado)

```bash
./start.sh
```

Este script:
- Verifica e instala dependencias automáticamente
- Copia `.env.example` a `.env` si no existe
- Inicia backend y frontend simultáneamente

### Opción 2: Inicio manual

#### Backend

```bash
cd backend
npm install
npx playwright install chromium
cp .env.example .env
# Edita .env con tus credenciales
npm run dev
```

#### Frontend

```bash
cd frontend
npm install
npm start
```

## Configuración

Edita el archivo `backend/.env` con:

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `OGAME_SERVER_NUMBER` | Número del servidor | `270` |
| `OGAME_UNIVERSE_NAME` | Nombre del universo | `Ophiuchus` |
| `OGAME_EMAIL` | Tu email de OGame | `tu_email@ejemplo.com` |
| `OGAME_PASSWORD` | Tu contraseña | `tu_password` |
| `PORT` | Puerto del servidor API | `3000` |
| `HEADLESS` | Modo sin ventana | `true` o `false` |

## API Endpoints

### Estado y Autenticación

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/health` | Health check del servidor |
| `GET` | `/api/status` | Estado del bot (navegador, login) |
| `POST` | `/api/login` | Login automático con credenciales |
| `POST` | `/api/manual-login` | Prepara navegador para login manual |
| `POST` | `/api/set-logged-in` | Marca como logueado manualmente |
| `POST` | `/api/close` | Cerrar navegador |

### Recursos y Planetas

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/resources` | Obtener recursos actuales |
| `GET` | `/api/planets` | Listar planetas |
| `GET` | `/api/storage` | Información de almacenes |
| `POST` | `/api/navigate` | Navegar a una página |

### Tareas Programadas

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/tasks` | Listar todas las tareas |
| `GET` | `/api/scheduler/status` | Estado del scheduler |
| `PUT` | `/api/tasks/:taskId` | Actualizar tarea |
| `POST` | `/api/tasks/:taskId/execute` | Ejecutar tarea manualmente |
| `POST` | `/api/scheduler/start` | Iniciar scheduler |
| `POST` | `/api/scheduler/stop` | Detener scheduler |

### Política Expansionista

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/expansion/status` | Estado de expansión |
| `GET` | `/api/expansion/config` | Configuración actual |
| `PUT` | `/api/expansion/config` | Actualizar configuración |
| `POST` | `/api/expansion/scan` | Escanear sistemas cercanos |
| `GET` | `/api/expansion/targets` | Objetivos de colonización |
| `POST` | `/api/expansion/execute` | Ejecutar política |
| `POST` | `/api/expansion/clear-cache` | Limpiar caché |

## Tareas Disponibles

| Tarea | Estado | Descripción |
|-------|--------|-------------|
| `maximize-mines` | ✅ Producción | Maximiza minas según ROI y ratios óptimos |
| `expansion-policy` | 🚧 Desarrollo | Colonización automática de planetas |

## URLs de Acceso

- **Backend API**: http://localhost:3000
- **Frontend Panel**: http://localhost:4200

## Documentación

- [Reglas de OGame](docs/OGAME_RULES.md) - Fórmulas y mecánicas del juego
- [Lógica de Construcción](docs/BUILDING_SELECTION_LOGIC.md) - Algoritmo de selección de edificios
- [Política Expansionista](docs/EXPANSION_POLICY.md) - Estrategias de colonización

## Tecnologías

- **Backend**: Node.js, Express, TypeScript, Playwright
- **Frontend**: Angular 19, TypeScript, SCSS
- **Automatización**: Playwright (Chromium)

---

*Última actualización: Febrero 2026*
