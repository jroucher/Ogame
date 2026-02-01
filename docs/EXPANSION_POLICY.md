# Política Expansionista - Estrategias de Colonización

Este documento describe las estrategias óptimas para explorar y colonizar planetas en OGame, sirviendo como base para la implementación del módulo "Política Expansionista" del bot.

---

## Índice

1. [Requisitos Previos](#requisitos-previos)
2. [Tecnología de Astrofísica](#tecnología-de-astrofísica)
3. [Posiciones Óptimas de Planetas](#posiciones-óptimas-de-planetas)
4. [Estrategias de Colonización](#estrategias-de-colonización)
5. [Exploración y Espionaje](#exploración-y-espionaje)
6. [Expediciones](#expediciones)
7. [Algoritmo de Decisión](#algoritmo-de-decisión)
8. [Implementación Propuesta](#implementación-propuesta)

---

## Requisitos Previos

### Para Colonizar

| Requisito | Descripción |
|-----------|-------------|
| **Laboratorio de Investigación** | Nivel 3 mínimo |
| **Tecnología de Espionaje** | Nivel 4 mínimo |
| **Motor de Impulso** | Nivel 3 mínimo |
| **Astrofísica** | Nivel 1 para 2 colonias, +1 colonia cada 2 niveles |
| **Nave Colonizadora** | 10.000 metal, 20.000 cristal, 10.000 deuterio |

### Fórmula de Colonias Máximas

```
Colonias_máximas = 1 + floor((nivel_astrofísica + 1) / 2)
```

| Nivel Astrofísica | Colonias Máximas | Expediciones Máximas |
|-------------------|------------------|----------------------|
| 1 | 2 | 1 |
| 3 | 3 | 1 |
| 4 | 3 | 2 |
| 5 | 4 | 2 |
| 7 | 5 | 2 |
| 9 | 6 | 3 |

### Posiciones Colonizables por Nivel de Astrofísica

| Nivel | Posiciones Disponibles |
|-------|------------------------|
| 1-3 | 4-12 |
| 4-5 | 3-13 |
| 6-7 | 2-14 |
| 8+ | 1-15 (todas) |

---

## Posiciones Óptimas de Planetas

### Tabla de Características por Posición

| Posición | Campos (min-max) | Temperatura (°C) | Bonus Producción | Deuterio | Satélites |
|----------|------------------|------------------|------------------|----------|-----------|
| 1 | 96-172 | 220-260 | +40% Cristal | Muy bajo | Excelente |
| 2 | 104-176 | 170-210 | +30% Cristal | Muy bajo | Excelente |
| 3 | 112-182 | 120-160 | +20% Cristal | Bajo | Muy bueno |
| 4 | 118-208 | 70-110 | - | Bajo | Bueno |
| 5 | 133-224 | 60-100 | - | Medio | Bueno |
| 6 | 148-236 | 50-90 | +17% Metal | Medio | Bueno |
| 7 | 163-248 | 40-80 | +23% Metal | Medio | Medio |
| **8** | **178-310** | **30-70** | **+35% Metal** | **Medio** | **Medio** |
| 9 | 163-248 | 20-60 | +23% Metal | Alto | Medio |
| 10 | 148-236 | 10-50 | +17% Metal | Alto | Bajo |
| 11 | 133-224 | 0-40 | - | Alto | Bajo |
| 12 | 118-208 | -10-30 | - | Alto | Bajo |
| 13 | 112-182 | -50--10 | - | Muy alto | Muy bajo |
| 14 | 104-176 | -90--50 | - | Muy alto | Muy bajo |
| 15 | 96-172 | -130--90 | - | Máximo | Mínimo |

### Recomendaciones por Objetivo

#### Para Máxima Producción de Metal (Recomendado para mayoría)
- **Posición 8**: Mejor balance entre campos grandes (+35% metal) y tamaño de planeta
- **Posiciones 7 y 9**: Alternativas con +23% metal

#### Para Producción de Deuterio
- **Posición 15**: Máxima producción de deuterio (planetas muy fríos)
- **Posiciones 13-14**: Alta producción de deuterio

#### Para Producción de Cristal
- **Posición 1**: +40% cristal, pero planetas pequeños
- **Posiciones 2-3**: Balance entre bonus de cristal y tamaño

#### Estrategia Balanceada (Recomendada)
1. **Planeta principal**: Posición 8 (máximo metal y campos)
2. **Colonias de producción**: Posiciones 7-9 (metal)
3. **1-2 colonias de deuterio**: Posiciones 14-15 (combustible)

---

## Estrategias de Colonización

### Estrategia 1: Expansión Rápida (Early Game)

**Objetivo**: Maximizar número de planetas lo antes posible.

```
Prioridades:
1. Investigar Astrofísica nivel 1 → 2 colonias
2. Construir nave colonizadora
3. Colonizar posición 8 en sistema cercano
4. Subir Astrofísica a nivel 3 → 3 colonias
5. Repetir hasta 5-6 colonias
```

**Ventajas**:
- Más planetas = más producción total
- Diversificación de recursos

**Desventajas**:
- Colonias pequeñas si no se tiene paciencia
- Alto consumo de recursos inicial

### Estrategia 2: Colonización Selectiva (Recomendada)

**Objetivo**: Obtener planetas grandes en posiciones óptimas.

```
Proceso:
1. Enviar nave colonizadora a posición 8
2. Si el planeta tiene < 200 campos → abandonar y recolonizar
3. Repetir hasta obtener planeta con 200+ campos
4. Desarrollar colonia antes de siguiente colonización
```

**Criterios de Aceptación**:
| Posición | Campos Mínimos Aceptables |
|----------|---------------------------|
| 8 | 200+ |
| 7, 9 | 180+ |
| 6, 10 | 170+ |
| Otras | 150+ |

### Estrategia 3: Colonización por Proximidad

**Objetivo**: Minimizar tiempo de viaje entre planetas.

```
Criterios de ubicación:
1. Misma galaxia que planeta principal
2. Sistemas cercanos (±50 sistemas)
3. Facilita defensa mutua y transporte de recursos
```

**Fórmula de tiempo de vuelo**:
```
Tiempo = 10 + 35000 / velocidad × sqrt(distancia × 10 / velocidad_flota)
```

### Estrategia 4: Colonización Distribuida

**Objetivo**: Presencia en múltiples galaxias para raiding.

```
Distribución recomendada:
- 2-3 planetas en galaxia principal
- 1-2 planetas en galaxias adyacentes
- 1 planeta en galaxia lejana (para expediciones)
```

---

## Exploración y Espionaje

### Uso de Sondas de Espionaje

Las sondas son esenciales para:
1. **Evaluar sistemas antes de colonizar**
2. **Identificar jugadores inactivos para farmeo**
3. **Planificar ataques**

### Fórmula de Información Obtenida

```
Puntos_espionaje = Num_sondas + (Tu_nivel_espionaje - Nivel_enemigo)²
```

| Puntos | Información Visible |
|--------|---------------------|
| 2+ | Recursos |
| 3+ | Flota |
| 5+ | Defensa |
| 7+ | Edificios |
| 9+ | Investigaciones |

### Estrategia de Escaneo de Sistemas

```typescript
interface ScanStrategy {
  // Escanear sistemas en rango para encontrar:
  // 1. Posiciones vacías para colonizar
  // 2. Jugadores inactivos (i) para farmear
  // 3. Campos de escombros para reciclar
  
  scanRange: number;        // ±X sistemas desde planeta
  priorityPositions: number[]; // [8, 7, 9, 6, 10]
  minInactivityDays: number;   // Días de inactividad para considerar farmeo
}
```

---

## Expediciones

### Beneficios de las Expediciones

| Resultado Posible | Probabilidad | Beneficio |
|-------------------|--------------|-----------|
| Recursos | ~35% | Metal, Cristal, Deuterio |
| Naves | ~15% | Naves aleatorias |
| Materia Oscura | ~10% | Premium currency |
| Nada | ~25% | Sin beneficio |
| Piratas/Aliens | ~15% | Combate (riesgo) |

### Flota Recomendada para Expediciones

```
Composición básica:
- 200+ Naves Grandes de Carga (capacidad)
- 1 Explorador (si disponible)
- Algunas naves de combate (protección)

Duración óptima: 1-2 horas (nivel astrofísica determina máximo)
```

### Fórmula de Expediciones Máximas

```
Expediciones_máximas = floor(sqrt(nivel_astrofísica))
```

---

## Algoritmo de Decisión

### Flujo de Decisión para Colonización

```
┌─────────────────────────────────────────┐
│     ¿Tenemos slot de colonia libre?     │
└─────────────────────┬───────────────────┘
                      │
            ┌─────────┴─────────┐
            │                   │
            ▼                   ▼
    ┌───────────────┐   ┌───────────────────┐
    │ NO            │   │ SÍ                │
    │ → Subir       │   │ → Continuar       │
    │   Astrofísica │   │                   │
    └───────────────┘   └─────────┬─────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │  ¿Tenemos nave          │
                    │  colonizadora?          │
                    └─────────────┬───────────┘
                                  │
                        ┌─────────┴─────────┐
                        │                   │
                        ▼                   ▼
                ┌───────────────┐   ┌───────────────┐
                │ NO            │   │ SÍ            │
                │ → Construir   │   │ → Buscar      │
                │   colonizadora│   │   destino     │
                └───────────────┘   └───────┬───────┘
                                            │
                                            ▼
                              ┌─────────────────────────┐
                              │  Escanear sistemas      │
                              │  cercanos               │
                              └─────────────┬───────────┘
                                            │
                                            ▼
                              ┌─────────────────────────┐
                              │  Evaluar posiciones     │
                              │  disponibles            │
                              └─────────────┬───────────┘
                                            │
                                            ▼
                              ┌─────────────────────────┐
                              │  Seleccionar mejor      │
                              │  posición (prioridad 8) │
                              └─────────────┬───────────┘
                                            │
                                            ▼
                              ┌─────────────────────────┐
                              │  Enviar colonizadora    │
                              └─────────────────────────┘
```

### Puntuación de Posiciones

```typescript
interface PositionScore {
  position: number;
  baseScore: number;      // Basado en bonus de producción
  sizeBonus: number;      // Basado en campos esperados
  distanceBonus: number;  // Cercanía al planeta principal
  totalScore: number;
}

// Pesos de puntuación
const POSITION_WEIGHTS = {
  8: 100,   // Mejor posición
  7: 85,
  9: 85,
  6: 70,
  10: 70,
  5: 55,
  11: 55,
  4: 40,
  12: 40,
  15: 60,  // Bonus por deuterio
  14: 50,
  13: 45,
  3: 35,
  2: 30,
  1: 25,
};
```

---

## Implementación Propuesta

### Estructura de Archivos

```
backend/src/
├── expansion/
│   ├── expansion-policy.ts      # Lógica principal de expansión
│   ├── galaxy-scanner.ts        # Escaneo de sistemas
│   ├── colonization-manager.ts  # Gestión de colonización
│   └── expedition-manager.ts    # Gestión de expediciones
```

### Interfaces Principales

```typescript
interface ExpansionConfig {
  enabled: boolean;
  maxColonies: number;
  preferredPositions: number[];
  minPlanetFields: number;
  scanRadius: number;
  autoRecolonize: boolean;
}

interface ColonizationTarget {
  galaxy: number;
  system: number;
  position: number;
  score: number;
  estimatedFields: { min: number; max: number };
  travelTime: number;
}

interface GalaxyScanResult {
  galaxy: number;
  system: number;
  positions: PositionInfo[];
  inactivePlayers: PlayerInfo[];
  debrisFields: DebrisInfo[];
}
```

### Tareas del Scheduler

```typescript
// Nueva tarea: Política Expansionista
{
  id: 'expansion-policy',
  name: 'Política Expansionista',
  enabled: false,
  interval: 30, // cada 30 minutos
  subtasks: [
    'check-colony-slots',
    'scan-nearby-systems',
    'evaluate-colonization',
    'manage-expeditions',
  ]
}
```

### Prioridades de la Política

1. **Verificar slots de colonia disponibles**
2. **Si no hay slots**: Priorizar investigación de Astrofísica
3. **Si hay slots pero no nave**: Construir nave colonizadora
4. **Si hay nave**: Escanear y seleccionar mejor destino
5. **Gestionar expediciones** en paralelo

---

## Métricas de Éxito

| Métrica | Objetivo |
|---------|----------|
| Colonias activas | Máximo permitido por Astrofísica |
| Campos promedio por colonia | > 180 |
| Tiempo entre colonizaciones | < 48 horas |
| Expediciones diarias | Máximo permitido |
| ROI de colonización | < 7 días |

---

## Referencias

- [OGame Wiki - Colonization](https://ogame.fandom.com/wiki/Colonization)
- [OGame Wiki - Astrophysics](https://ogame.fandom.com/wiki/Astrophysics)
- [OGame Wiki - Espionage](https://ogame.fandom.com/wiki/Espionage)
- `docs/OGAME_RULES.md` - Reglas generales del juego

---

*Documento generado para el proyecto OGame Bot - Módulo Política Expansionista*
*Última actualización: Febrero 2026*
