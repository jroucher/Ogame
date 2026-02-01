# OGame Bot - Frontend

Panel de control web para el bot de OGame, construido con Angular 19.

## Características

- **Dashboard interactivo** - Visualización de recursos, planetas y estado del bot
- **Control del Scheduler** - Iniciar/detener y configurar tareas programadas
- **Feature Flags** - Sistema de flags para habilitar/deshabilitar funcionalidades
- **Diseño moderno** - Interfaz oscura inspirada en el estilo de OGame

## Estructura del Proyecto

```
src/app/
├── components/
│   └── dashboard/          # Componente principal del dashboard
├── services/
│   └── api.service.ts      # Servicio de comunicación con el backend
├── config/
│   └── feature-flags.config.ts  # Configuración de feature flags
├── app.component.ts        # Componente raíz
├── app.config.ts           # Configuración de la aplicación
└── app.routes.ts           # Rutas de la aplicación
```

## Desarrollo

### Servidor de desarrollo

```bash
npm start
# o
ng serve
```

La aplicación estará disponible en `http://localhost:4200/`. Se recargará automáticamente al modificar archivos.

### Requisitos

- El backend debe estar ejecutándose en `http://localhost:3000`
- Node.js 18+ recomendado

### Generar componentes

```bash
ng generate component components/nombre-componente
```

### Build de producción

```bash
ng build
```

Los artefactos se generan en `dist/`.

## Feature Flags

El sistema de feature flags permite habilitar/deshabilitar funcionalidades:

| Flag | Estado | Descripción |
|------|--------|-------------|
| `maximize-mines` | ✅ Habilitado | Maximización automática de minas |
| `expansion-policy` | ❌ Deshabilitado | Política expansionista (en desarrollo) |

Configuración en `src/app/config/feature-flags.config.ts`.

## Servicios Disponibles

### ApiService

Servicio principal para comunicación con el backend:

- `getStatus()` - Estado del bot
- `login()` / `manualLogin()` - Autenticación
- `getResources()` - Recursos actuales
- `getPlanets()` - Lista de planetas
- `getStorageInfo()` - Información de almacenes
- `getTasks()` - Tareas programadas
- `getSchedulerStatus()` - Estado del scheduler
- `startScheduler()` / `stopScheduler()` - Control del scheduler

## Tecnologías

- **Angular 19** - Framework principal
- **TypeScript** - Lenguaje de programación
- **SCSS** - Estilos
- **Signals** - Gestión de estado reactivo
- **Standalone Components** - Arquitectura de componentes

## Scripts Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm start` | Inicia servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm test` | Ejecuta tests unitarios |
| `npm run watch` | Build en modo watch |

## Recursos Adicionales

- [Angular CLI](https://angular.dev/tools/cli) - Documentación oficial
- [Angular Signals](https://angular.dev/guide/signals) - Guía de signals

---

*Última actualización: Febrero 2026*
