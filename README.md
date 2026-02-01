# OGame Bot

Bot para gestionar tu cuenta de OGame con panel de control web.

## Estructura

- `backend/` - API con Playwright para automatización
- `frontend/` - Panel de control Angular

## Setup

### Backend

```bash
cd backend
npm install
npx playwright install chromium
cp .env.example .env
# Edita .env con tus credenciales
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm start
```

## API Endpoints

- `GET /health` - Health check
- `GET /api/status` - Estado del bot
- `POST /api/login` - Iniciar sesión en OGame
- `GET /api/resources` - Obtener recursos actuales
- `GET /api/planets` - Listar planetas
- `POST /api/navigate` - Navegar a una página
- `POST /api/close` - Cerrar navegador

## Configuración

Edita el archivo `.env` con:

- `OGAME_UNIVERSE` - URL de tu universo
- `OGAME_EMAIL` - Tu email de OGame
- `OGAME_PASSWORD` - Tu contraseña
- `HEADLESS` - `true` para modo sin ventana, `false` para ver el navegador
