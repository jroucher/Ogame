# OGame Bot - Backend

API REST y motor de automatización para el bot de OGame, construido con Node.js, Express y Playwright.

## Características

- **API REST** - Endpoints para controlar el bot desde el frontend
- **Automatización con Playwright** - Control del navegador Chromium
- **Scheduler de Tareas** - Sistema de tareas programadas con intervalos configurables
- **Fórmulas de OGame** - Cálculos precisos de costos, producción y ROI
- **Módulo de Expansión** - Sistema de colonización y exploración de galaxias

## Estructura del Proyecto

```
src/
├── api/
│   └── routes.ts           # Definición de endpoints REST
├── browser/
│   ├── browser-manager.ts  # Gestión del navegador Playwright
│   └── ogame-client.ts     # Cliente para interactuar con OGame
├── config/
│   └── index.ts            # Configuración del servidor
├── expansion/
│   ├── expansion-policy.ts     # Lógica de política expansionista
│   ├── expansion-types.ts      # Tipos e interfaces
│   ├── galaxy-scanner.ts       # Escaneo de sistemas
│   ├── colonization-manager.ts # Gestión de colonización
│   └── index.ts                # Exports del módulo
├── game/
│   └── ogame-formulas.ts   # Fórmulas matemáticas del juego
├── scheduler/
│   └── task-scheduler.ts   # Sistema de tareas programadas
└── index.ts                # Punto de entrada del servidor
```

## Instalación

```bash
# Instalar dependencias
npm install

# Instalar navegador Chromium para Playwright
npx playwright install chromium

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales
```

## Configuración

Edita el archivo `.env`:

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `OGAME_SERVER_NUMBER` | Número del servidor | `270` |
| `OGAME_UNIVERSE_NAME` | Nombre del universo | `Ophiuchus` |
| `OGAME_EMAIL` | Tu email de OGame | `tu_email@ejemplo.com` |
| `OGAME_PASSWORD` | Tu contraseña | `tu_password` |
| `PORT` | Puerto del servidor API | `3000` |
| `HEADLESS` | Modo sin ventana | `true` o `false` |

## Scripts Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Inicia servidor en modo desarrollo (hot reload) |
| `npm run build` | Compila TypeScript a JavaScript |
| `npm start` | Inicia servidor en producción |

## Módulos

### Browser Manager

Gestiona la instancia del navegador Playwright:
- Inicialización lazy del navegador
- Configuración de headless/headed mode
- Cierre limpio de recursos

### OGame Client

Cliente para interactuar con el juego:
- Login automático y manual
- Extracción de recursos y planetas
- Navegación entre páginas del juego
- Información de almacenes y niveles de edificios

### Task Scheduler

Sistema de tareas programadas:

| Tarea | Intervalo | Descripción |
|-------|-----------|-------------|
| `maximize-mines` | 1 min | Construye minas/almacenes según ROI |
| `expansion-policy` | 30 min | Gestiona colonización |

### OGame Formulas

Fórmulas matemáticas del juego:

```typescript
// Costos base
BASE_COSTS = {
  metalMine: { metal: 60, crystal: 15, factor: 1.5 },
  crystalMine: { metal: 48, crystal: 24, factor: 1.6 },
  deuteriumSynthesizer: { metal: 225, crystal: 75, factor: 1.5 },
  solarPlant: { metal: 75, crystal: 30, factor: 1.5 },
}

// Producción base por hora
BASE_PRODUCTION = {
  metalMine: 30,
  crystalMine: 20,
  deuteriumSynthesizer: 10,
  solarPlant: 20,
}
```

### Expansion Module

Módulo de política expansionista:
- **ExpansionPolicy** - Coordinación de la expansión
- **GalaxyScanner** - Escaneo de sistemas cercanos
- **ColonizationManager** - Gestión de colonización

## API Endpoints

### Estado y Autenticación

```
GET  /health              # Health check
GET  /api/status          # Estado del bot
POST /api/login           # Login automático
POST /api/manual-login    # Login manual
POST /api/set-logged-in   # Marcar como logueado
POST /api/close           # Cerrar navegador
```

### Recursos y Planetas

```
GET  /api/resources       # Recursos actuales
GET  /api/planets         # Lista de planetas
GET  /api/storage         # Información de almacenes
POST /api/navigate        # Navegar a página
```

### Scheduler

```
GET  /api/tasks                    # Listar tareas
GET  /api/scheduler/status         # Estado del scheduler
PUT  /api/tasks/:taskId            # Actualizar tarea
POST /api/tasks/:taskId/execute    # Ejecutar tarea
POST /api/scheduler/start          # Iniciar scheduler
POST /api/scheduler/stop           # Detener scheduler
```

### Expansión

```
GET  /api/expansion/status         # Estado de expansión
GET  /api/expansion/config         # Configuración
PUT  /api/expansion/config         # Actualizar config
POST /api/expansion/scan           # Escanear sistemas
GET  /api/expansion/targets        # Objetivos de colonización
POST /api/expansion/execute        # Ejecutar política
POST /api/expansion/clear-cache    # Limpiar caché
```

## Dependencias

### Producción

| Paquete | Versión | Descripción |
|---------|---------|-------------|
| `express` | ^4.21.0 | Framework web |
| `playwright` | ^1.48.0 | Automatización del navegador |
| `cors` | ^2.8.5 | Middleware CORS |
| `dotenv` | ^16.4.5 | Variables de entorno |
| `node-cron` | ^3.0.3 | Tareas programadas |

### Desarrollo

| Paquete | Versión | Descripción |
|---------|---------|-------------|
| `typescript` | ^5.6.2 | Lenguaje TypeScript |
| `tsx` | ^4.19.1 | Ejecución de TypeScript |
| `@types/*` | - | Definiciones de tipos |

## Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (Angular)                   │
└─────────────────────────────┬───────────────────────────┘
                              │ HTTP
                              ▼
┌─────────────────────────────────────────────────────────┐
│                    Express API Server                    │
│                      (routes.ts)                         │
└─────────────────────────────┬───────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐   ┌─────────────────┐   ┌───────────────┐
│  OGame Client │   │  Task Scheduler │   │   Expansion   │
│               │   │                 │   │    Policy     │
└───────┬───────┘   └────────┬────────┘   └───────────────┘
        │                    │
        ▼                    ▼
┌───────────────┐   ┌─────────────────┐
│    Browser    │   │  OGame Formulas │
│    Manager    │   │                 │
└───────┬───────┘   └─────────────────┘
        │
        ▼
┌───────────────────────────────────────────────────────┐
│                  Playwright (Chromium)                 │
└───────────────────────────────────────────────────────┘
```

## Desarrollo

### Añadir nueva tarea

1. Definir la tarea en `task-scheduler.ts`:

```typescript
this.addTask({
  id: 'mi-tarea',
  name: 'Mi Nueva Tarea',
  enabled: false,
  interval: 5, // minutos
});
```

2. Implementar la lógica en `executeTask()`:

```typescript
case 'mi-tarea':
  return await this.ejecutarMiTarea();
```

### Añadir nuevo endpoint

En `routes.ts`:

```typescript
router.get('/mi-endpoint', async (_req: Request, res: Response) => {
  try {
    const result = await miServicio.hacerAlgo();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Error en mi endpoint' });
  }
});
```

## Documentación Relacionada

- [Reglas de OGame](../docs/OGAME_RULES.md) - Fórmulas y mecánicas
- [Lógica de Construcción](../docs/BUILDING_SELECTION_LOGIC.md) - Algoritmo de selección
- [Política Expansionista](../docs/EXPANSION_POLICY.md) - Estrategias de colonización

---

*Última actualización: Febrero 2026*
