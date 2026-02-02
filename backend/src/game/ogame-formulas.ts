/**
 * Fórmulas matemáticas de OGame
 * Basadas en la documentación oficial del juego
 */

// Costos base de cada edificio
export const BASE_COSTS = {
  metalMine: { metal: 60, crystal: 15, deuterium: 0, factor: 1.5 },
  crystalMine: { metal: 48, crystal: 24, deuterium: 0, factor: 1.6 },
  deuteriumSynthesizer: { metal: 225, crystal: 75, deuterium: 0, factor: 1.5 },
  solarPlant: { metal: 75, crystal: 30, deuterium: 0, factor: 1.5 },
  fusionReactor: { metal: 900, crystal: 360, deuterium: 180, factor: 1.8 },
};

// Producción base por hora
export const BASE_PRODUCTION = {
  metalMine: 30,
  crystalMine: 20,
  deuteriumSynthesizer: 10,
  solarPlant: 20,
};

// Consumo base de energía
export const BASE_ENERGY_CONSUMPTION = {
  metalMine: 10,
  crystalMine: 10,
  deuteriumSynthesizer: 20,
};

// Costos base de almacenes
export const STORAGE_BASE_COSTS = {
  metalStorage: { metal: 1000, crystal: 0, deuterium: 0, factor: 2 },
  crystalStorage: { metal: 1000, crystal: 500, deuterium: 0, factor: 2 },
  deuteriumStorage: { metal: 1000, crystal: 1000, deuterium: 0, factor: 2 },
};

// Capacidad base sin almacén
export const BASE_STORAGE_CAPACITY = 10000;

export interface StorageLevels {
  metal: number;
  crystal: number;
  deuterium: number;
}

export interface StorageCapacity {
  metal: number;
  crystal: number;
  deuterium: number;
}

export interface MineCost {
  metal: number;
  crystal: number;
  deuterium: number;
}

export interface MineStats {
  level: number;
  cost: MineCost;
  production: number;
  energyConsumption: number;
  energyProduction: number;
  roi: number; // Horas para amortizar la inversión
}

export interface MineLevels {
  metal: number;
  crystal: number;
  deuterium: number;
  solar: number;
  solarSatellites: number;
}

/**
 * Calcula el costo de un edificio para un nivel específico
 */
export function calculateBuildingCost(
  buildingType: keyof typeof BASE_COSTS,
  level: number
): MineCost {
  const base = BASE_COSTS[buildingType];
  const factor = Math.pow(base.factor, level - 1);
  
  return {
    metal: Math.floor(base.metal * factor),
    crystal: Math.floor(base.crystal * factor),
    deuterium: Math.floor(base.deuterium * factor),
  };
}

/**
 * Calcula la producción por hora de una mina
 */
export function calculateProduction(
  mineType: 'metalMine' | 'crystalMine' | 'deuteriumSynthesizer',
  level: number,
  universeSpeed: number = 1,
  temperature: number = 0 // Solo para deuterio
): number {
  const base = BASE_PRODUCTION[mineType];
  const production = base * level * Math.pow(1.1, level) * universeSpeed;
  
  if (mineType === 'deuteriumSynthesizer') {
    // La producción de deuterio depende de la temperatura
    const tempFactor = 1.36 - 0.004 * temperature;
    return Math.floor(production * tempFactor);
  }
  
  return Math.floor(production);
}

/**
 * Calcula el incremento de producción al subir un nivel
 */
export function calculateProductionIncrease(
  mineType: 'metalMine' | 'crystalMine' | 'deuteriumSynthesizer',
  currentLevel: number,
  universeSpeed: number = 1,
  temperature: number = 0
): number {
  const currentProduction = calculateProduction(mineType, currentLevel, universeSpeed, temperature);
  const nextProduction = calculateProduction(mineType, currentLevel + 1, universeSpeed, temperature);
  return nextProduction - currentProduction;
}

/**
 * Calcula el consumo de energía de una mina
 */
export function calculateEnergyConsumption(
  mineType: 'metalMine' | 'crystalMine' | 'deuteriumSynthesizer',
  level: number
): number {
  const base = BASE_ENERGY_CONSUMPTION[mineType];
  return Math.ceil(base * level * Math.pow(1.1, level));
}

/**
 * Calcula el incremento de consumo de energía al subir un nivel
 */
export function calculateEnergyConsumptionIncrease(
  mineType: 'metalMine' | 'crystalMine' | 'deuteriumSynthesizer',
  currentLevel: number
): number {
  const currentConsumption = calculateEnergyConsumption(mineType, currentLevel);
  const nextConsumption = calculateEnergyConsumption(mineType, currentLevel + 1);
  return nextConsumption - currentConsumption;
}

/**
 * Calcula la producción de energía de una planta solar
 */
export function calculateSolarPlantProduction(level: number): number {
  return Math.floor(20 * level * Math.pow(1.1, level));
}

/**
 * Calcula el incremento de producción de energía al subir un nivel
 */
export function calculateSolarPlantProductionIncrease(currentLevel: number): number {
  const currentProduction = calculateSolarPlantProduction(currentLevel);
  const nextProduction = calculateSolarPlantProduction(currentLevel + 1);
  return nextProduction - currentProduction;
}

/**
 * Calcula la producción de energía de los satélites solares
 * Cada satélite produce una cantidad fija de energía (depende de la temperatura del planeta)
 * Fórmula: floor((Tmax + 160) / 6) por satélite
 * Para simplificar, usamos un valor promedio de 40 energía por satélite (temperatura ~80°C)
 */
export function calculateSolarSatelliteProduction(count: number, maxTemperature: number = 80): number {
  const energyPerSatellite = Math.floor((maxTemperature + 160) / 6);
  return count * energyPerSatellite;
}

/**
 * Calcula el ROI (Retorno de Inversión) en horas
 * ROI = Costo total / Incremento de producción por hora
 */
export function calculateROI(
  mineType: 'metalMine' | 'crystalMine' | 'deuteriumSynthesizer',
  currentLevel: number,
  universeSpeed: number = 1,
  temperature: number = 0
): number {
  const cost = calculateBuildingCost(mineType, currentLevel + 1);
  const productionIncrease = calculateProductionIncrease(mineType, currentLevel, universeSpeed, temperature);
  
  if (productionIncrease <= 0) return Infinity;
  
  // Convertir todo a "unidades de metal equivalente"
  // Ratio aproximado: 1 Metal = 1, 1 Cristal = 1.5, 1 Deuterio = 3
  const totalCostEquivalent = cost.metal + cost.crystal * 1.5 + cost.deuterium * 3;
  
  // Producción equivalente según el tipo de mina
  let productionEquivalent: number;
  switch (mineType) {
    case 'metalMine':
      productionEquivalent = productionIncrease;
      break;
    case 'crystalMine':
      productionEquivalent = productionIncrease * 1.5;
      break;
    case 'deuteriumSynthesizer':
      productionEquivalent = productionIncrease * 3;
      break;
  }
  
  return totalCostEquivalent / productionEquivalent;
}

/**
 * Calcula el balance de energía actual
 * Incluye producción de planta solar + satélites solares
 */
export function calculateEnergyBalance(levels: MineLevels, maxTemperature: number = 80): {
  production: number;
  consumption: number;
  balance: number;
  solarPlantProduction: number;
  solarSatelliteProduction: number;
} {
  const solarPlantProduction = calculateSolarPlantProduction(levels.solar);
  const solarSatelliteProduction = calculateSolarSatelliteProduction(levels.solarSatellites, maxTemperature);
  const production = solarPlantProduction + solarSatelliteProduction;
  const consumption = 
    calculateEnergyConsumption('metalMine', levels.metal) +
    calculateEnergyConsumption('crystalMine', levels.crystal) +
    calculateEnergyConsumption('deuteriumSynthesizer', levels.deuterium);
  
  return {
    production,
    consumption,
    balance: production - consumption,
    solarPlantProduction,
    solarSatelliteProduction,
  };
}

/**
 * Predice el balance de energía después de construir una mina
 */
export function predictEnergyAfterBuild(
  levels: MineLevels,
  mineType: 'metal' | 'crystal' | 'deuterium' | 'solar'
): {
  production: number;
  consumption: number;
  balance: number;
} {
  const newLevels = { ...levels };
  
  switch (mineType) {
    case 'metal':
      newLevels.metal++;
      break;
    case 'crystal':
      newLevels.crystal++;
      break;
    case 'deuterium':
      newLevels.deuterium++;
      break;
    case 'solar':
      newLevels.solar++;
      break;
  }
  
  return calculateEnergyBalance(newLevels);
}

/**
 * Calcula el ratio de producción de recursos
 */
export function calculateProductionRatio(levels: MineLevels, universeSpeed: number = 1): {
  metal: number;
  crystal: number;
  deuterium: number;
  metalPercent: number;
  crystalPercent: number;
  deuteriumPercent: number;
} {
  const metalProd = calculateProduction('metalMine', levels.metal, universeSpeed);
  const crystalProd = calculateProduction('crystalMine', levels.crystal, universeSpeed);
  const deuteriumProd = calculateProduction('deuteriumSynthesizer', levels.deuterium, universeSpeed);
  
  const total = metalProd + crystalProd + deuteriumProd;
  
  return {
    metal: metalProd,
    crystal: crystalProd,
    deuterium: deuteriumProd,
    metalPercent: total > 0 ? (metalProd / total) * 100 : 0,
    crystalPercent: total > 0 ? (crystalProd / total) * 100 : 0,
    deuteriumPercent: total > 0 ? (deuteriumProd / total) * 100 : 0,
  };
}

/**
 * Ratios óptimos de producción
 * Ajustados para potenciar el desarrollo de deuterio
 */
export const OPTIMAL_RATIOS = {
  metal: 40,      // Reducido de 45% a 40%
  crystal: 30,    // Reducido de 35% a 30%
  deuterium: 30,  // Aumentado de 20% a 30% para priorizar deuterio
};

/**
 * Determina qué recurso está más desequilibrado respecto al ratio óptimo
 */
export function getMostUnbalancedResource(levels: MineLevels, universeSpeed: number = 1): 'metal' | 'crystal' | 'deuterium' | null {
  const ratio = calculateProductionRatio(levels, universeSpeed);
  
  const metalDiff = OPTIMAL_RATIOS.metal - ratio.metalPercent;
  const crystalDiff = OPTIMAL_RATIOS.crystal - ratio.crystalPercent;
  const deuteriumDiff = OPTIMAL_RATIOS.deuterium - ratio.deuteriumPercent;
  
  // El recurso más desequilibrado es el que tiene mayor diferencia positiva
  // (significa que está produciendo menos de lo óptimo)
  const maxDiff = Math.max(metalDiff, crystalDiff, deuteriumDiff);
  
  if (maxDiff <= 0) return null; // Todos están en ratio óptimo o superior
  
  if (metalDiff === maxDiff) return 'metal';
  if (crystalDiff === maxDiff) return 'crystal';
  return 'deuterium';
}

/**
 * Obtiene las estadísticas completas de una mina para el siguiente nivel
 */
export function getMineUpgradeStats(
  mineType: 'metal' | 'crystal' | 'deuterium' | 'solar',
  currentLevel: number,
  universeSpeed: number = 1,
  temperature: number = 0
): MineStats {
  const nextLevel = currentLevel + 1;
  
  if (mineType === 'solar') {
    const cost = calculateBuildingCost('solarPlant', nextLevel);
    const energyProduction = calculateSolarPlantProductionIncrease(currentLevel);
    
    return {
      level: nextLevel,
      cost,
      production: 0,
      energyConsumption: 0,
      energyProduction,
      roi: 0, // La planta solar no tiene ROI directo
    };
  }
  
  const mineTypeKey = mineType === 'metal' ? 'metalMine' : 
                      mineType === 'crystal' ? 'crystalMine' : 'deuteriumSynthesizer';
  
  const cost = calculateBuildingCost(mineTypeKey, nextLevel);
  const productionIncrease = calculateProductionIncrease(mineTypeKey, currentLevel, universeSpeed, temperature);
  const energyConsumptionIncrease = calculateEnergyConsumptionIncrease(mineTypeKey, currentLevel);
  const roi = calculateROI(mineTypeKey, currentLevel, universeSpeed, temperature);
  
  return {
    level: nextLevel,
    cost,
    production: productionIncrease,
    energyConsumption: energyConsumptionIncrease,
    energyProduction: 0,
    roi,
  };
}

/**
 * Determina la mejor mina a construir basándose en múltiples factores
 */
export function determineBestMineToBuild(
  levels: MineLevels,
  resources: { metal: number; crystal: number; deuterium: number; energy: number },
  universeSpeed: number = 1,
  temperature: number = 0
): {
  recommendation: 'metal' | 'crystal' | 'deuterium' | 'solar' | null;
  reason: string;
  stats: MineStats | null;
  alternatives: Array<{ type: string; reason: string; stats: MineStats }>;
  canAfford?: boolean;
} {
  const alternatives: Array<{ type: string; reason: string; stats: MineStats }> = [];
  
  // Obtener estadísticas de todas las minas
  const metalStats = getMineUpgradeStats('metal', levels.metal, universeSpeed, temperature);
  const crystalStats = getMineUpgradeStats('crystal', levels.crystal, universeSpeed, temperature);
  const deuteriumStats = getMineUpgradeStats('deuterium', levels.deuterium, universeSpeed, temperature);
  const solarStats = getMineUpgradeStats('solar', levels.solar, universeSpeed, temperature);
  
  // Calcular balance de energía actual
  const currentEnergy = calculateEnergyBalance(levels);
  
  // REGLA 1: Si la energía es negativa, construir planta solar
  if (resources.energy < 0 || currentEnergy.balance < 0) {
    if (resources.metal >= solarStats.cost.metal && resources.crystal >= solarStats.cost.crystal) {
      return {
        recommendation: 'solar',
        reason: `Energía negativa (${resources.energy}). Necesitas planta solar urgentemente.`,
        stats: solarStats,
        alternatives: [],
      };
    } else {
      return {
        recommendation: null,
        reason: `Energía negativa pero no hay recursos para planta solar (necesitas ${solarStats.cost.metal} metal, ${solarStats.cost.crystal} cristal)`,
        stats: null,
        alternatives: [],
      };
    }
  }
  
  // REGLA 2: Verificar si podemos pagar cada mina
  // Separamos la verificación de recursos de la verificación de energía  
  // Verificar si podemos pagar con recursos (sin considerar energía)
  const canAffordResources = {
    metal: resources.metal >= metalStats.cost.metal && resources.crystal >= metalStats.cost.crystal,
    crystal: resources.metal >= crystalStats.cost.metal && resources.crystal >= crystalStats.cost.crystal,
    deuterium: resources.metal >= deuteriumStats.cost.metal && resources.crystal >= deuteriumStats.cost.crystal,
    solar: resources.metal >= solarStats.cost.metal && resources.crystal >= solarStats.cost.crystal,
  };
  
  // Verificar si tenemos energía suficiente para cada mina
  const hasEnoughEnergy = {
    metal: (resources.energy - metalStats.energyConsumption) >= 0,
    crystal: (resources.energy - crystalStats.energyConsumption) >= 0,
    deuterium: (resources.energy - deuteriumStats.energyConsumption) >= 0,
  };
  
  // canAfford combina recursos Y energía
  const canAfford = {
    metal: canAffordResources.metal && hasEnoughEnergy.metal,
    crystal: canAffordResources.crystal && hasEnoughEnergy.crystal,
    deuterium: canAffordResources.deuterium && hasEnoughEnergy.deuterium,
    solar: canAffordResources.solar,
  };
  
  console.log(`   canAffordResources: metal=${canAffordResources.metal}, crystal=${canAffordResources.crystal}, deuterium=${canAffordResources.deuterium}, solar=${canAffordResources.solar}`);
  console.log(`   hasEnoughEnergy: metal=${hasEnoughEnergy.metal}, crystal=${hasEnoughEnergy.crystal}, deuterium=${hasEnoughEnergy.deuterium}`);
  console.log(`   canAfford (final): metal=${canAfford.metal}, crystal=${canAfford.crystal}, deuterium=${canAfford.deuterium}, solar=${canAfford.solar}`);
  
  // REGLA 3: Si no podemos pagar ninguna mina de recursos por falta de energía, construir solar
  const hasResourcesButNoEnergy = 
    (canAffordResources.metal || canAffordResources.crystal || canAffordResources.deuterium) &&
    !canAfford.metal && !canAfford.crystal && !canAfford.deuterium;
  
  if (hasResourcesButNoEnergy) {
    if (canAfford.solar) {
      return {
        recommendation: 'solar',
        reason: `Tienes recursos pero no energía suficiente para minas. Construye planta solar primero.`,
        stats: solarStats,
        alternatives: [],
      };
    }
    
    // No podemos pagar la planta solar - esperar y mostrar información útil
    const metalNeeded = solarStats.cost.metal - resources.metal;
    const crystalNeeded = solarStats.cost.crystal - resources.crystal;
    
    console.log(`\n⏳ ESPERANDO RECURSOS PARA PLANTA SOLAR:`);
    console.log(`   Necesitas: ${solarStats.cost.metal} metal, ${solarStats.cost.crystal} cristal`);
    console.log(`   Tienes: ${resources.metal} metal, ${resources.crystal} cristal`);
    if (metalNeeded > 0) console.log(`   Faltan: ${metalNeeded} metal`);
    if (crystalNeeded > 0) console.log(`   Faltan: ${crystalNeeded} cristal`);
    
    return {
      recommendation: null,
      reason: `Necesitas planta solar (costo: ${solarStats.cost.metal}/${solarStats.cost.crystal}) pero faltan recursos. Esperando...`,
      stats: solarStats,
      alternatives: [],
    };
  }
  
  // REGLA 4: Calcular ROI de cada mina que podemos pagar
  const affordableMines: Array<{ type: 'metal' | 'crystal' | 'deuterium'; stats: MineStats; roi: number }> = [];
  
  if (canAfford.metal) {
    affordableMines.push({ type: 'metal', stats: metalStats, roi: metalStats.roi });
  }
  if (canAfford.crystal) {
    affordableMines.push({ type: 'crystal', stats: crystalStats, roi: crystalStats.roi });
  }
  if (canAfford.deuterium) {
    affordableMines.push({ type: 'deuterium', stats: deuteriumStats, roi: deuteriumStats.roi });
  }
  
  if (affordableMines.length === 0) {
    if (canAfford.solar) {
      return {
        recommendation: 'solar',
        reason: `No hay recursos para minas de recursos. Construyendo planta solar.`,
        stats: solarStats,
        alternatives: [],
      };
    }
    
    // Calcular cuál sería la mejor mina basándose en ROI
    const allMines = [
      { type: 'metal' as const, stats: metalStats, roi: metalStats.roi },
      { type: 'crystal' as const, stats: crystalStats, roi: crystalStats.roi },
      { type: 'deuterium' as const, stats: deuteriumStats, roi: deuteriumStats.roi },
    ].sort((a, b) => a.roi - b.roi);
    
    const bestMine = allMines[0];
    const bestStats = bestMine.stats;
    
    // Calcular qué falta para construirla
    const metalNeeded = Math.max(0, bestStats.cost.metal - resources.metal);
    const crystalNeeded = Math.max(0, bestStats.cost.crystal - resources.crystal);
    const energyNeeded = !hasEnoughEnergy[bestMine.type] ? bestStats.energyConsumption - resources.energy : 0;
    
    const missingParts: string[] = [];
    if (metalNeeded > 0) missingParts.push(`${metalNeeded.toLocaleString()} metal`);
    if (crystalNeeded > 0) missingParts.push(`${crystalNeeded.toLocaleString()} cristal`);
    if (energyNeeded > 0) missingParts.push(`${energyNeeded} energía`);
    
    return {
      recommendation: bestMine.type,
      reason: `Mejor opción por ROI (${bestMine.roi.toFixed(1)}h). Faltan: ${missingParts.join(', ')}`,
      stats: bestStats,
      alternatives: allMines.slice(1).map(m => ({
        type: m.type,
        reason: `ROI: ${m.roi.toFixed(1)}h`,
        stats: m.stats,
      })),
      canAfford: false,
    };
  }
  
  // Ordenar por ROI (menor es mejor)
  affordableMines.sort((a, b) => a.roi - b.roi);
  
  // REGLA 5: Verificar ratio de recursos
  const unbalancedResource = getMostUnbalancedResource(levels, universeSpeed);
  
  // Si hay un recurso muy desequilibrado y podemos construir esa mina, priorizarla
  if (unbalancedResource) {
    const unbalancedMine = affordableMines.find(m => m.type === unbalancedResource);
    if (unbalancedMine) {
      // Solo priorizar si el ROI no es mucho peor que el mejor
      const bestROI = affordableMines[0].roi;
      if (unbalancedMine.roi <= bestROI * 1.5) {
        // Añadir alternativas
        for (const mine of affordableMines) {
          if (mine.type !== unbalancedResource) {
            alternatives.push({
              type: mine.type,
              reason: `ROI: ${mine.roi.toFixed(1)}h`,
              stats: mine.stats,
            });
          }
        }
        
        return {
          recommendation: unbalancedResource,
          reason: `Recurso desequilibrado (${unbalancedResource} está bajo). ROI: ${unbalancedMine.roi.toFixed(1)}h`,
          stats: unbalancedMine.stats,
          alternatives,
        };
      }
    }
  }
  
  // REGLA 6: Elegir la mina con mejor ROI
  const best = affordableMines[0];
  
  // Añadir alternativas
  for (const mine of affordableMines.slice(1)) {
    alternatives.push({
      type: mine.type,
      reason: `ROI: ${mine.roi.toFixed(1)}h`,
      stats: mine.stats,
    });
  }
  
  return {
    recommendation: best.type,
    reason: `Mejor ROI: ${best.roi.toFixed(1)}h (amortización más rápida)`,
    stats: best.stats,
    alternatives,
  };
}

// ==================== FUNCIONES DE ALMACENES ====================

/**
 * Calcula la capacidad de almacenamiento para un nivel dado
 * Fórmula: 5000 × floor(2.5 × e^(20 × nivel / 33))
 * Nivel 0 = capacidad base de 10.000
 */
export function calculateStorageCapacity(level: number): number {
  if (level === 0) return BASE_STORAGE_CAPACITY;
  return Math.floor(5000 * Math.floor(2.5 * Math.exp(20 * level / 33)));
}

/**
 * Calcula el costo de un almacén para un nivel específico
 */
export function calculateStorageCost(
  storageType: keyof typeof STORAGE_BASE_COSTS,
  level: number
): MineCost {
  const base = STORAGE_BASE_COSTS[storageType];
  const factor = Math.pow(base.factor, level - 1);
  
  return {
    metal: Math.floor(base.metal * factor),
    crystal: Math.floor(base.crystal * factor),
    deuterium: Math.floor(base.deuterium * factor),
  };
}

/**
 * Obtiene las capacidades actuales de todos los almacenes
 */
export function getStorageCapacities(storageLevels: StorageLevels): StorageCapacity {
  return {
    metal: calculateStorageCapacity(storageLevels.metal),
    crystal: calculateStorageCapacity(storageLevels.crystal),
    deuterium: calculateStorageCapacity(storageLevels.deuterium),
  };
}

/**
 * Verifica si necesitamos construir un almacén para poder pagar una construcción
 * Devuelve el tipo de almacén necesario o null si no hace falta
 */
export function checkStorageNeeded(
  mineCost: MineCost,
  storageLevels: StorageLevels,
  currentResources: { metal: number; crystal: number; deuterium: number }
): 'metalStorage' | 'crystalStorage' | 'deuteriumStorage' | null {
  const capacities = getStorageCapacities(storageLevels);
  
  // Verificar si el costo supera la capacidad de almacenamiento
  if (mineCost.metal > capacities.metal) {
    return 'metalStorage';
  }
  if (mineCost.crystal > capacities.crystal) {
    return 'crystalStorage';
  }
  if (mineCost.deuterium > capacities.deuterium) {
    return 'deuteriumStorage';
  }
  
  return null;
}

/**
 * Obtiene las estadísticas de mejora de un almacén
 */
export function getStorageUpgradeStats(
  storageType: 'metal' | 'crystal' | 'deuterium',
  currentLevel: number
): {
  level: number;
  cost: MineCost;
  currentCapacity: number;
  newCapacity: number;
  capacityIncrease: number;
} {
  const storageKey = `${storageType}Storage` as keyof typeof STORAGE_BASE_COSTS;
  const nextLevel = currentLevel + 1;
  const cost = calculateStorageCost(storageKey, nextLevel);
  const currentCapacity = calculateStorageCapacity(currentLevel);
  const newCapacity = calculateStorageCapacity(nextLevel);
  
  return {
    level: nextLevel,
    cost,
    currentCapacity,
    newCapacity,
    capacityIncrease: newCapacity - currentCapacity,
  };
}

/**
 * Determina si necesitamos construir un almacén antes de poder construir una mina
 * Retorna información sobre qué almacén construir y por qué
 * 
 * PRIORIDAD 1: Recursos cerca del límite (>90% capacidad) - evitar perder producción
 * PRIORIDAD 2: Costo de minas supera capacidad
 */
export function determineStorageNeeded(
  levels: MineLevels,
  storageLevels: StorageLevels,
  resources: { metal: number; crystal: number; deuterium: number },
  universeSpeed: number = 1
): {
  needed: boolean;
  storageType: 'metal' | 'crystal' | 'deuterium' | null;
  reason: string;
  stats: ReturnType<typeof getStorageUpgradeStats> | null;
} {
  const capacities = getStorageCapacities(storageLevels);
  
  // PRIORIDAD 1: Verificar si algún recurso está cerca del límite (>90%)
  // Esto evita perder producción mientras esperamos construir algo
  const STORAGE_THRESHOLD = 0.90; // 90% de capacidad
  
  const metalPercent = resources.metal / capacities.metal;
  const crystalPercent = resources.crystal / capacities.crystal;
  const deuteriumPercent = resources.deuterium / capacities.deuterium;
  
  // Encontrar el recurso más lleno que supere el umbral
  const storageUrgency = [
    { type: 'metal' as const, percent: metalPercent, current: resources.metal, capacity: capacities.metal, level: storageLevels.metal },
    { type: 'crystal' as const, percent: crystalPercent, current: resources.crystal, capacity: capacities.crystal, level: storageLevels.crystal },
    { type: 'deuterium' as const, percent: deuteriumPercent, current: resources.deuterium, capacity: capacities.deuterium, level: storageLevels.deuterium },
  ].filter(s => s.percent >= STORAGE_THRESHOLD)
   .sort((a, b) => b.percent - a.percent);
  
  if (storageUrgency.length > 0) {
    const urgent = storageUrgency[0];
    const stats = getStorageUpgradeStats(urgent.type, urgent.level);
    const percentStr = Math.round(urgent.percent * 100);
    return {
      needed: true,
      storageType: urgent.type,
      reason: `¡URGENTE! ${urgent.type} al ${percentStr}% (${urgent.current.toLocaleString()}/${urgent.capacity.toLocaleString()}) - evitar pérdida de producción`,
      stats,
    };
  }
  
  // PRIORIDAD 2: Verificar si algún costo de mina supera la capacidad
  const metalCost = getMineUpgradeStats('metal', levels.metal, universeSpeed);
  const crystalCost = getMineUpgradeStats('crystal', levels.crystal, universeSpeed);
  const deuteriumCost = getMineUpgradeStats('deuterium', levels.deuterium, universeSpeed);
  const solarCost = getMineUpgradeStats('solar', levels.solar, universeSpeed);
  
  const maxMetalCost = Math.max(
    metalCost.cost.metal,
    crystalCost.cost.metal,
    deuteriumCost.cost.metal,
    solarCost.cost.metal
  );
  
  const maxCrystalCost = Math.max(
    metalCost.cost.crystal,
    crystalCost.cost.crystal,
    deuteriumCost.cost.crystal,
    solarCost.cost.crystal
  );
  
  if (maxMetalCost > capacities.metal) {
    const stats = getStorageUpgradeStats('metal', storageLevels.metal);
    return {
      needed: true,
      storageType: 'metal',
      reason: `Costo de mina (${maxMetalCost}) supera capacidad de metal (${capacities.metal})`,
      stats,
    };
  }
  
  if (maxCrystalCost > capacities.crystal) {
    const stats = getStorageUpgradeStats('crystal', storageLevels.crystal);
    return {
      needed: true,
      storageType: 'crystal',
      reason: `Costo de mina (${maxCrystalCost}) supera capacidad de cristal (${capacities.crystal})`,
      stats,
    };
  }
  
  return {
    needed: false,
    storageType: null,
    reason: 'Capacidad de almacenamiento suficiente',
    stats: null,
  };
}
