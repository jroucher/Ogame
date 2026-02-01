#!/bin/bash

# OGame Bot - Startup Script
# Arranca el backend y frontend simultáneamente

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         OGame Bot - Startup            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"

# Función para limpiar procesos al salir
cleanup() {
    echo -e "\n${YELLOW}Deteniendo servicios...${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    echo -e "${GREEN}Servicios detenidos.${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Verificar que existen los directorios
if [ ! -d "$BACKEND_DIR" ]; then
    echo -e "${RED}Error: No se encuentra el directorio backend${NC}"
    exit 1
fi

if [ ! -d "$FRONTEND_DIR" ]; then
    echo -e "${RED}Error: No se encuentra el directorio frontend${NC}"
    exit 1
fi

# Verificar node_modules
check_dependencies() {
    local dir=$1
    local name=$2
    
    if [ ! -d "$dir/node_modules" ]; then
        echo -e "${YELLOW}Instalando dependencias de $name...${NC}"
        (cd "$dir" && npm install)
    fi
}

# Verificar .env en backend
if [ ! -f "$BACKEND_DIR/.env" ]; then
    echo -e "${YELLOW}Advertencia: No existe .env en backend${NC}"
    if [ -f "$BACKEND_DIR/.env.example" ]; then
        echo -e "${YELLOW}Copiando .env.example a .env...${NC}"
        cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
        echo -e "${RED}¡Recuerda editar backend/.env con tus credenciales!${NC}"
    fi
fi

# Instalar dependencias si es necesario
check_dependencies "$BACKEND_DIR" "Backend"
check_dependencies "$FRONTEND_DIR" "Frontend"

echo ""
echo -e "${GREEN}Iniciando servicios...${NC}"
echo ""

# Iniciar Backend
echo -e "${BLUE}[Backend]${NC} Iniciando en http://localhost:3000"
(cd "$BACKEND_DIR" && npm run dev) &
BACKEND_PID=$!

# Esperar un momento para que el backend arranque
sleep 2

# Iniciar Frontend
echo -e "${BLUE}[Frontend]${NC} Iniciando en http://localhost:4200"
(cd "$FRONTEND_DIR" && npm start) &
FRONTEND_PID=$!

echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         Servicios iniciados            ║${NC}"
echo -e "${GREEN}╠════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  Backend:  http://localhost:3000       ║${NC}"
echo -e "${GREEN}║  Frontend: http://localhost:4200       ║${NC}"
echo -e "${GREEN}╠════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  Presiona Ctrl+C para detener          ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""

# Esperar a que terminen los procesos
wait
