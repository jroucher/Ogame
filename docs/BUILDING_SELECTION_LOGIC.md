# Lógica de Selección de Edificios para Construcción

Este documento describe el algoritmo que utiliza el bot para decidir qué edificio construir en cada momento.

## Flujo de Decisión

```
┌─────────────────────────────────────────┐
│         INICIO DE VERIFICACIÓN          │
└─────────────────────┬───────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────┐
│    ¿Hay construcción en curso?          │
│                                         │
│  Busca: "No hay edificios en            │
│         construcción"                   │
└─────────────────────┬───────────────────┘
                      │
            ┌─────────┴─────────┐
            │                   │
            ▼                   ▼
    ┌───────────────┐   ┌───────────────────┐
    │ SÍ hay        │   │ NO hay            │
    │ construcción  │   │ construcción      │
    └───────┬───────┘   └─────────┬─────────┘
            │                     │
            ▼                     ▼
    ┌───────────────┐   ┌───────────────────┐
    │ Extraer       │   │ Continuar con     │
    │ duración      │   │ selección         │
    │ restante      │   │                   │
    └───────┬───────┘   └─────────┬─────────┘
            │                     │
            ▼                     │
    ┌───────────────┐             │
    │ Esperar hasta │             │
    │ que termine   │             │
    │ (+10s margen) │             │
    └───────────────┘             │
                                  ▼
                    ┌─────────────────────────┐
                    │  PRIORIDAD 1:           │
                    │  ¿Almacén urgente?      │
                    │  (recurso > 90%)        │
                    └─────────────┬───────────┘
                                  │
                        ┌─────────┴─────────┐
                        │                   │
                        ▼                   ▼
                ┌───────────────┐   ┌───────────────┐
                │ SÍ urgente    │   │ NO urgente    │
                └───────┬───────┘   └───────┬───────┘
                        │                   │
                        ▼                   ▼
                ┌───────────────┐   ┌───────────────────┐
                │ Construir     │   │  PRIORIDAD 2:     │
                │ almacén del   │   │  ¿Costo mina >    │
                │ recurso más   │   │  capacidad?       │
                │ lleno         │   └─────────┬─────────┘
                └───────────────┘             │
                                    ┌─────────┴─────────┐
                                    │                   │
                                    ▼                   ▼
                            ┌───────────────┐   ┌───────────────┐
                            │ SÍ supera     │   │ NO supera     │
                            └───────┬───────┘   └───────┬───────┘
                                    │                   │
                                    ▼                   ▼
                            ┌───────────────┐   ┌───────────────────┐
                            │ Construir     │   │  PRIORIDAD 3:     │
                            │ almacén       │   │  ¿Energía         │
                            │ necesario     │   │  suficiente?      │
                            └───────────────┘   └─────────┬─────────┘
                                                          │
                                                ┌─────────┴─────────┐
                                                │                   │
                                                ▼                   ▼
                                        ┌───────────────┐   ┌───────────────┐
                                        │ NO hay        │   │ SÍ hay        │
                                        │ energía       │   │ energía       │
                                        └───────┬───────┘   └───────┬───────┘
                                                │                   │
                                                ▼                   ▼
                                        ┌───────────────┐   ┌───────────────────┐
                                        │ Construir     │   │  PRIORIDAD 4:     │
                                        │ Planta Solar  │   │  Seleccionar mina │
                                        └───────────────┘   │  por ROI/Ratio    │
                                                            └───────────────────┘
```

## Prioridades de Construcción

### PRIORIDAD 1: Almacén Urgente (Recursos > 90%)

**Objetivo:** Evitar perder producción cuando los recursos están cerca del límite.

```typescript
const STORAGE_THRESHOLD = 0.90; // 90% de capacidad

// Si metal está al 95% → construir almacén de metal
// Si cristal está al 92% → construir almacén de cristal
// Si deuterio está al 91% → construir almacén de deuterio
```

**Comportamiento:**
- Verifica el porcentaje de llenado de cada recurso
- Si alguno supera el 90%, prioriza construir su almacén
- Si hay varios recursos por encima del 90%, construye el del recurso **más lleno**

### PRIORIDAD 2: Almacén por Capacidad Insuficiente

**Objetivo:** Asegurar que podemos acumular recursos para construir minas.

- Calcula el costo máximo de metal/cristal entre todas las minas posibles
- Si el costo supera la capacidad actual del almacén, construye el almacén

### PRIORIDAD 3: Planta Solar (Energía)

**Objetivo:** Mantener energía positiva para que las minas produzcan al 100%.

**Condiciones para construir Planta Solar:**
1. La energía actual es insuficiente para construir cualquier mina
2. Hay recursos para pagar la planta solar

**Si no hay recursos para la planta solar:**
- El bot espera y muestra qué recursos faltan
- NO construye minas que dejarían energía negativa

### PRIORIDAD 4: Selección de Mina (ROI + Ratio)

**Objetivo:** Maximizar la producción a largo plazo.

#### Ratios Óptimos de Producción
```typescript
OPTIMAL_RATIOS = {
  metal: 40%,      // Objetivo de producción de metal
  crystal: 30%,    // Objetivo de producción de cristal
  deuterium: 30%,  // Objetivo de producción de deuterio (potenciado)
}
```

#### Algoritmo de Selección

1. **Calcular ROI** de cada mina:
   ```
   ROI = (Producción adicional × Valor del recurso) / Costo total
   ```

2. **Verificar recursos y energía** para cada mina:
   - ¿Tenemos metal y cristal suficientes?
   - ¿La energía resultante será positiva?

3. **Seleccionar la mejor opción:**
   - Entre las minas que podemos pagar y no dejan energía negativa
   - Elegir la de mejor ROI

## Valores de Recursos

Para calcular el ROI, se usan estos valores relativos:

```typescript
RESOURCE_VALUES = {
  metal: 1,
  crystal: 2,
  deuterium: 3,
}
```

El deuterio vale 3x más que el metal porque:
- Es más escaso (menor producción base)
- Es necesario para tecnologías avanzadas y flotas

## Configuración del Scheduler

### Intervalo de Verificación

- **Sin construcción:** Verifica cada 1 minuto
- **Con construcción:** Espera hasta que termine + 10 segundos de margen

### Comportamiento con Scheduler Parado

- Las tareas programadas NO se ejecutan
- El botón "Actualizar datos" SÍ funciona (usa API directamente)

## Ejemplo de Decisión

```
📊 ========== MAXIMIZAR MINAS ==========
💰 Recursos actuales:
   - Metal: 9,200
   - Cristal: 4,500
   - Deuterio: 2,100
   - Energía: 15

🏭 Niveles actuales de minas:
   - Metal: 6
   - Cristal: 5
   - Deuterio: 3
   - Planta Solar: 8

📦 Almacenes:
   - Metal: nivel 0 (capacidad: 10,000)
   - Cristal: nivel 0 (capacidad: 10,000)
   - Deuterio: nivel 0 (capacidad: 10,000)

⚠️ ¡ALMACÉN NECESARIO!
   - Tipo: metal
   - Razón: ¡URGENTE! metal al 92% (9,200/10,000) - evitar pérdida de producción
   - Costo: 1,000 metal, 0 cristal
   ✅ Podemos pagar el almacén, construyendo...
```

## Archivos Relacionados

- `backend/src/scheduler/task-scheduler.ts` - Lógica del scheduler y ejecución
- `backend/src/game/ogame-formulas.ts` - Fórmulas de cálculo y algoritmo de decisión
- `docs/OGAME_RULES.md` - Reglas y fórmulas del juego OGame
