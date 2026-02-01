# OGame - Guía Completa de Reglas y Mecánicas

## Índice
1. [Introducción](#introducción)
2. [Recursos](#recursos)
3. [Edificios de Recursos](#edificios-de-recursos)
4. [Energía](#energía)
5. [Fórmulas de Costos](#fórmulas-de-costos)
6. [Fórmulas de Producción](#fórmulas-de-producción)
7. [Estrategias de Optimización](#estrategias-de-optimización)
8. [Investigación](#investigación)
9. [Flotas y Combate](#flotas-y-combate)
10. [Defensa](#defensa)

---

## Introducción

OGame es un juego de estrategia espacial en tiempo real donde los jugadores construyen un imperio intergaláctico. El objetivo principal es desarrollar planetas, investigar tecnologías, construir flotas y expandirse por el universo.

### Conceptos Básicos
- **Planetas**: Cada jugador comienza con un planeta principal y puede colonizar hasta 8 planetas adicionales
- **Universo**: Dividido en galaxias (1-9), sistemas solares (1-499) y posiciones (1-15)
- **Tiempo Real**: Las construcciones, investigaciones y viajes de flotas ocurren en tiempo real

---

## Recursos

OGame tiene tres recursos principales y uno secundario:

### Recursos Principales

| Recurso | Descripción | Uso Principal |
|---------|-------------|---------------|
| **Metal** | Recurso más abundante | Base de todas las construcciones |
| **Cristal** | Recurso intermedio | Electrónica y tecnología |
| **Deuterio** | Recurso más escaso | Combustible y tecnología avanzada |

### Recurso Secundario

| Recurso | Descripción |
|---------|-------------|
| **Energía** | Necesaria para operar minas. No se almacena, se produce y consume en tiempo real |

### Almacenamiento

Los recursos se almacenan en almacenes específicos:
- **Almacén de Metal**: Aumenta capacidad de almacenamiento de metal
- **Almacén de Cristal**: Aumenta capacidad de almacenamiento de cristal
- **Tanque de Deuterio**: Aumenta capacidad de almacenamiento de deuterio

**Capacidad base (sin almacén):** 10.000 unidades de cada recurso

**Fórmula de capacidad de almacenamiento:**
```
Capacidad = 5000 × floor(2.5 × e^(20 × nivel / 33))
```

**Tabla de capacidades por nivel:**

| Nivel | Capacidad | Costo Metal | Costo Cristal |
|-------|-----------|-------------|---------------|
| 0 | 10.000 | - | - |
| 1 | 20.000 | 1.000 | 500 |
| 2 | 40.000 | 2.000 | 1.000 |
| 3 | 75.000 | 4.000 | 2.000 |
| 4 | 140.000 | 8.000 | 4.000 |
| 5 | 255.000 | 16.000 | 8.000 |
| 6 | 470.000 | 32.000 | 16.000 |
| 7 | 860.000 | 64.000 | 32.000 |
| 8 | 1.580.000 | 128.000 | 64.000 |

**Fórmula de costos de almacén:**
```
Costo_metal = 1000 × 2^nivel
Costo_cristal = 500 × 2^nivel
```

**Selectores CSS (para el bot):**
```
Metal:    li.metalStorage
Cristal:  li.crystalStorage
Deuterio: li.deuteriumStorage
```

**Cuándo construir almacenes:**
1. Cuando el costo de la próxima mina supera la capacidad actual
2. Cuando la producción por hora × 8 horas supera la capacidad (para no perder recursos mientras duermes)
3. Antes de acumular recursos para construcciones grandes (flotas, investigaciones)

---

## Edificios de Recursos

### Mina de Metal

Produce metal, el recurso más básico y abundante.

| Nivel | Costo Metal | Costo Cristal | Producción/hora | Consumo Energía |
|-------|-------------|---------------|-----------------|-----------------|
| 1 | 60 | 15 | 30 | 10 |
| 2 | 90 | 22 | 66 | 22 |
| 3 | 135 | 33 | 109 | 37 |
| 4 | 202 | 50 | 161 | 55 |
| 5 | 303 | 75 | 223 | 77 |
| 6 | 455 | 113 | 297 | 102 |
| 7 | 682 | 170 | 386 | 133 |
| 8 | 1024 | 256 | 494 | 170 |
| 9 | 1536 | 384 | 622 | 214 |
| 10 | 2304 | 576 | 777 | 267 |

### Mina de Cristal

Produce cristal, necesario para electrónica y tecnología.

| Nivel | Costo Metal | Costo Cristal | Producción/hora | Consumo Energía |
|-------|-------------|---------------|-----------------|-----------------|
| 1 | 48 | 24 | 20 | 10 |
| 2 | 76 | 38 | 44 | 22 |
| 3 | 122 | 61 | 73 | 37 |
| 4 | 195 | 97 | 107 | 55 |
| 5 | 312 | 156 | 148 | 77 |
| 6 | 499 | 249 | 198 | 102 |
| 7 | 799 | 399 | 257 | 133 |
| 8 | 1278 | 639 | 329 | 170 |
| 9 | 2045 | 1022 | 415 | 214 |
| 10 | 3272 | 1636 | 518 | 267 |

### Sintetizador de Deuterio

Produce deuterio, el recurso más valioso.

| Nivel | Costo Metal | Costo Cristal | Producción/hora* | Consumo Energía |
|-------|-------------|---------------|------------------|-----------------|
| 1 | 225 | 75 | 11 | 20 |
| 2 | 337 | 112 | 23 | 40 |
| 3 | 506 | 168 | 35 | 60 |
| 4 | 759 | 253 | 48 | 80 |
| 5 | 1139 | 379 | 62 | 100 |
| 6 | 1709 | 569 | 77 | 120 |
| 7 | 2564 | 854 | 93 | 140 |
| 8 | 3846 | 1282 | 110 | 160 |
| 9 | 5769 | 1923 | 128 | 180 |
| 10 | 8654 | 2884 | 147 | 200 |

*La producción de deuterio depende de la temperatura del planeta (planetas más fríos producen más)

---

## Energía

La energía es crucial para el funcionamiento de las minas. Sin energía suficiente, la producción se reduce proporcionalmente.

### Fuentes de Energía

#### Planta de Energía Solar

La fuente más básica y económica de energía.

| Nivel | Costo Metal | Costo Cristal | Producción Energía |
|-------|-------------|---------------|-------------------|
| 1 | 75 | 30 | 20 |
| 2 | 112 | 45 | 44 |
| 3 | 168 | 67 | 73 |
| 4 | 253 | 101 | 107 |
| 5 | 379 | 151 | 148 |
| 6 | 569 | 227 | 198 |
| 7 | 854 | 341 | 257 |
| 8 | 1281 | 512 | 329 |
| 9 | 1922 | 768 | 415 |
| 10 | 2883 | 1153 | 518 |

#### Planta de Fusión

Produce energía consumiendo deuterio. Más eficiente en niveles altos.

**Fórmula de producción:**
```
Energía = 30 × nivel × (1.05 + nivel_tecnología_energía × 0.01)^nivel
```

**Consumo de deuterio:**
```
Deuterio/hora = 10 × nivel × 1.1^nivel
```

#### Satélites Solares

Producen energía sin costo de mantenimiento, pero pueden ser destruidos en ataques.

**Producción por satélite:**
```
Energía = floor((temperatura_max + 140) / 6)
```

### Balance de Energía

**Regla fundamental:** Si la energía disponible es menor que la requerida, la producción de TODAS las minas se reduce proporcionalmente.

```
Factor_producción = Energía_disponible / Energía_requerida
```

**Ejemplo:**
- Energía disponible: 100
- Energía requerida: 200
- Factor de producción: 50%
- Todas las minas producen al 50%

---

## Fórmulas de Costos

### Fórmula General de Costos

Para la mayoría de edificios:
```
Costo_nivel = Costo_base × factor^(nivel - 1)
```

| Edificio | Costo Base Metal | Costo Base Cristal | Factor |
|----------|------------------|-------------------|--------|
| Mina de Metal | 60 | 15 | 1.5 |
| Mina de Cristal | 48 | 24 | 1.6 |
| Sintetizador Deuterio | 225 | 75 | 1.5 |
| Planta Solar | 75 | 30 | 1.5 |
| Planta de Fusión | 900 | 360 | 1.8 |

### Tiempo de Construcción

```
Tiempo_segundos = (Metal + Cristal) / (2500 × (1 + nivel_fábrica_robots) × 2^nivel_nanobots) × 3600
```

---

## Fórmulas de Producción

### Producción de Metal
```
Producción/hora = 30 × nivel × 1.1^nivel × factor_universo
```

### Producción de Cristal
```
Producción/hora = 20 × nivel × 1.1^nivel × factor_universo
```

### Producción de Deuterio
```
Producción/hora = 10 × nivel × 1.1^nivel × (1.36 - 0.004 × temperatura_max) × factor_universo
```

### Consumo de Energía (Minas)

```
Energía_metal = 10 × nivel × 1.1^nivel
Energía_cristal = 10 × nivel × 1.1^nivel
Energía_deuterio = 20 × nivel × 1.1^nivel
```

### Producción de Energía (Planta Solar)
```
Energía = 20 × nivel × 1.1^nivel
```

---

## Estrategias de Optimización

### Orden Óptimo de Construcción

1. **Inicio del juego (niveles 1-5):**
   - Priorizar Mina de Metal (es la más barata)
   - Mantener Planta Solar para tener energía positiva
   - Subir Mina de Cristal cuando el metal sea abundante

2. **Desarrollo medio (niveles 5-15):**
   - Mantener ratio aproximado: Metal:Cristal:Deuterio = 3:2:1
   - Construir almacenes cuando la producción supere la capacidad
   - Considerar Planta de Fusión a partir de nivel 10

3. **Desarrollo avanzado (niveles 15+):**
   - Los costos crecen exponencialmente
   - Considerar múltiples planetas para diversificar producción
   - Satélites solares pueden ser más eficientes que plantas solares

### Regla del ROI (Retorno de Inversión)

**Fórmula de amortización:**
```
Horas_amortización = Costo_total / Incremento_producción_por_hora
```

**Regla general:** Si la amortización es menor a 24-48 horas, vale la pena construir.

### Ratio de Recursos Óptimo

Para maximizar la producción total, mantener aproximadamente:
- **Metal:** 40-45% del total
- **Cristal:** 30-35% del total
- **Deuterio:** 20-25% del total

### Cuándo Construir Energía

Construir planta solar cuando:
1. La energía disponible es negativa
2. La energía disponible es menor que el consumo de la próxima mina a construir
3. El costo de la planta solar es menor que el costo de cualquier mina disponible

### ⚠️ Problema Potencial: Inanición de Deuterio

**Descripción del problema:**

El algoritmo de ROI actual convierte todos los recursos a "unidades de metal equivalente":
- Metal: x1
- Cristal: x1.5
- Deuterio: x3

Esto significa que el sintetizador de deuterio puede tener un ROI teóricamente mejor porque su producción se valora más alto. Sin embargo, **el sintetizador de deuterio cuesta metal y cristal, no deuterio**.

**Escenario de inanición:**
1. El jugador tiene mucho deuterio almacenado pero poco metal/cristal
2. El algoritmo recomienda "construir sintetizador de deuterio" (mejor ROI teórico)
3. Pero no puede construirla porque no tiene suficiente metal/cristal
4. El deuterio sigue acumulándose pero no puede usarse para construir

**Soluciones propuestas (no implementadas aún):**

1. **Verificación de recursos almacenados:**
   - Si deuterio > 50% capacidad Y metal < 20% capacidad → priorizar metal
   - Evita acumular recursos que no puedes usar

2. **Penalización de ROI:**
   - Penalizar el ROI de deuterio si ya tienes mucho almacenado
   - `ROI_ajustado = ROI_base * (1 + deuterio_almacenado / capacidad)`

3. **Límite de nivel relativo:**
   - No subir deuterio más de 2-3 niveles por encima de metal/cristal
   - Mantiene balance entre minas

4. **Verificación de "recursos productores":**
   - Priorizar minas que producen recursos necesarios para construir
   - Metal y cristal son "recursos productores" (necesarios para todo)
   - Deuterio es "recurso consumible" (solo para flotas y tecnología avanzada)

**Estado:** Documentado para implementación futura si se detecta el problema.

---

## Investigación

### Laboratorio de Investigación

Necesario para investigar tecnologías. Nivel más alto = investigaciones más rápidas.

### Tecnologías Importantes

| Tecnología | Requisitos | Beneficio |
|------------|------------|-----------|
| Tecnología de Energía | Lab 1 | +5% producción energía por nivel |
| Tecnología Láser | Lab 1, Energía 2 | Desbloquea defensas láser |
| Tecnología de Iones | Lab 4, Láser 5, Energía 4 | Desbloquea cañón de iones |
| Tecnología de Plasma | Lab 4, Energía 8, Láser 10, Iones 5 | +1% producción metal, +0.66% cristal, +0.33% deuterio por nivel |
| Motor de Combustión | Lab 1, Energía 1 | Velocidad de naves pequeñas |
| Motor de Impulso | Lab 2, Energía 1 | Velocidad de naves medianas |
| Motor de Propulsión Hiperespacial | Lab 7, Impulso 3, Hiperespacial 3 | Velocidad de naves grandes |
| Tecnología de Espionaje | Lab 3 | Mejor información de espionaje |
| Tecnología de Computación | Lab 1 | +1 slot de flota por nivel |
| Astrofísica | Lab 3, Espionaje 4, Impulso 3 | Permite colonizar más planetas |
| Red Intergaláctica de Investigación | Lab 10, Computación 8, Hiperespacial 8 | Combina laboratorios de varios planetas |

---

## Flotas y Combate

### Tipos de Naves

#### Naves Civiles
| Nave | Metal | Cristal | Deuterio | Capacidad | Velocidad |
|------|-------|---------|----------|-----------|-----------|
| Nave Pequeña de Carga | 2.000 | 2.000 | 0 | 5.000 | 5.000 |
| Nave Grande de Carga | 6.000 | 6.000 | 0 | 25.000 | 7.500 |
| Nave Colonizadora | 10.000 | 20.000 | 10.000 | 7.500 | 2.500 |
| Reciclador | 10.000 | 6.000 | 2.000 | 20.000 | 2.000 |
| Sonda de Espionaje | 0 | 1.000 | 0 | 5 | 100.000.000 |

#### Naves de Combate
| Nave | Metal | Cristal | Deuterio | Ataque | Escudo | Estructura |
|------|-------|---------|----------|--------|--------|------------|
| Cazador Ligero | 3.000 | 1.000 | 0 | 50 | 10 | 4.000 |
| Cazador Pesado | 6.000 | 4.000 | 0 | 150 | 25 | 10.000 |
| Crucero | 20.000 | 7.000 | 2.000 | 400 | 50 | 27.000 |
| Nave de Batalla | 45.000 | 15.000 | 0 | 1.000 | 200 | 60.000 |
| Acorazado | 30.000 | 40.000 | 15.000 | 700 | 400 | 70.000 |
| Bombardero | 50.000 | 25.000 | 15.000 | 1.000 | 500 | 75.000 |
| Destructor | 60.000 | 50.000 | 15.000 | 2.000 | 500 | 110.000 |
| Estrella de la Muerte | 5.000.000 | 4.000.000 | 1.000.000 | 200.000 | 50.000 | 9.000.000 |

### Sistema de Combate

1. **Rondas:** El combate se desarrolla en rondas (máximo 6)
2. **Disparo rápido:** Algunas naves tienen bonificación contra otras
3. **Escombros:** 30% del metal y cristal de naves destruidas queda como escombros
4. **Defensa:** 70% de las defensas destruidas se reconstruyen automáticamente

---

## Defensa

### Tipos de Defensa

| Defensa | Metal | Cristal | Deuterio | Ataque | Escudo | Estructura |
|---------|-------|---------|----------|--------|--------|------------|
| Lanzamisiles | 2.000 | 0 | 0 | 80 | 20 | 2.000 |
| Láser Pequeño | 1.500 | 500 | 0 | 100 | 25 | 2.000 |
| Láser Grande | 6.000 | 2.000 | 0 | 250 | 100 | 8.000 |
| Cañón Gauss | 20.000 | 15.000 | 2.000 | 1.100 | 200 | 35.000 |
| Cañón de Iones | 5.000 | 3.000 | 0 | 150 | 500 | 8.000 |
| Cañón de Plasma | 50.000 | 50.000 | 30.000 | 3.000 | 300 | 100.000 |
| Cúpula Pequeña de Escudo | 10.000 | 10.000 | 0 | 1 | 2.000 | 20.000 |
| Cúpula Grande de Escudo | 50.000 | 50.000 | 0 | 1 | 10.000 | 100.000 |

### Misiles

- **Misil Antibalístico:** Destruye misiles interplanetarios enemigos
- **Misil Interplanetario:** Destruye defensas enemigas a distancia

---

## Apéndice: Constantes del Juego

### Velocidades del Universo
- **Velocidad económica:** Multiplicador de producción de recursos
- **Velocidad de flotas:** Multiplicador de velocidad de naves
- **Velocidad de investigación:** Multiplicador de tiempo de investigación

### Posiciones de Planetas

| Posición | Temperatura | Campos | Deuterio |
|----------|-------------|--------|----------|
| 1-3 | Muy caliente | Pequeños | Muy bajo |
| 4-6 | Caliente | Medianos | Bajo |
| 7-9 | Templado | Grandes | Medio |
| 10-12 | Frío | Medianos | Alto |
| 13-15 | Muy frío | Pequeños | Muy alto |

**Nota:** La posición 8 suele ser la más equilibrada para el planeta principal.

---

## Referencias

- [OGame Wiki Oficial](https://wiki.ogame.org/)
- [OGame Fandom](https://ogame.fandom.com/)
- [Calculadora de OGame](https://trashsim.oplanet.eu/)

---

*Documento generado para el proyecto OGame Bot*
*Última actualización: Enero 2026*
