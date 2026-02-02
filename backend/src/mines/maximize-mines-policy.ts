import { ogameClient } from '../browser/ogame-client.js';
import {
  determineBestMineToBuild,
  calculateEnergyBalance,
  calculateProductionRatio,
  OPTIMAL_RATIOS,
  getStorageCapacities,
  determineStorageNeeded,
  getStorageUpgradeStats,
} from '../game/ogame-formulas.js';
import { buildMine, buildStorage } from './mines-utils.js';
import { gameDataService } from '../data-sync/index.js';

export class MaximizeMinesPolicy {
  async execute(): Promise<{ success: boolean; message: string }> {
    if (!ogameClient.getLoginStatus()) {
      return { success: false, message: 'No hay sesión activa en OGame' };
    }

    // Verificar que data-sync esté habilitado y tenga datos frescos
    const syncStatus = gameDataService.getStatus();
    if (!syncStatus.enabled) {
      return { success: false, message: 'Data sync debe estar habilitado para ejecutar esta tarea' };
    }

    if (!gameDataService.isDataFresh(300)) {
      return { success: false, message: 'Datos no disponibles o muy antiguos. Esperando sincronización.' };
    }

    try {
      console.log('\n📊 ========== MAXIMIZAR MINAS ==========');
      console.log('💾 Usando datos desde caché (data-sync)');

      // Obtener todos los datos desde caché
      const resources = gameDataService.getResourcesFromCache();
      const levels = gameDataService.getMineLevelsFromCache();
      const storageLevels = gameDataService.getStorageLevelsFromCache();

      if (!resources) {
        return { success: false, message: 'No hay recursos en caché' };
      }

      if (!levels) {
        return { success: false, message: 'No hay niveles de minas en caché' };
      }

      console.log('💰 Recursos actuales (caché):');
      console.log(`   - Metal: ${resources.metal.toLocaleString()}`);
      console.log(`   - Cristal: ${resources.crystal.toLocaleString()}`);
      console.log(`   - Deuterio: ${resources.deuterium.toLocaleString()}`);
      console.log(`   - Energía: ${resources.energy}`);

      // Verificar si hay construcción en curso usando datos cacheados
      const productionStatus = gameDataService.getBuildingProductionStatus();
      if (productionStatus.inProduction) {
        const waitTime = productionStatus.remainingSeconds + 10;
        console.log(`⏳ Construcción en curso: ${productionStatus.buildingName || 'Edificio'}`);
        console.log(`   Tiempo restante: ${Math.ceil(productionStatus.remainingSeconds / 60)} minutos`);
        return { 
          success: true, 
          message: `Construcción en curso (${productionStatus.buildingName || 'Edificio'}). Próxima verificación en ${Math.ceil(waitTime / 60)} minutos.` 
        };
      }

      console.log('\n🏭 Niveles actuales de minas (caché):');
      console.log(`   - Metal: ${levels.metal}`);
      console.log(`   - Cristal: ${levels.crystal}`);
      console.log(`   - Deuterio: ${levels.deuterium}`);
      console.log(`   - Planta Solar: ${levels.solar}`);
      console.log(`   - Satélites Solares: ${levels.solarSatellites}`);

      // Verificar almacenes
      if (storageLevels) {
        const capacities = getStorageCapacities(storageLevels);
        console.log('\n📦 Almacenes (caché):');
        console.log(`   - Metal: nivel ${storageLevels.metal} (capacidad: ${capacities.metal.toLocaleString()})`);
        console.log(`   - Cristal: nivel ${storageLevels.crystal} (capacidad: ${capacities.crystal.toLocaleString()})`);
        console.log(`   - Deuterio: nivel ${storageLevels.deuterium} (capacidad: ${capacities.deuterium.toLocaleString()})`);

        // Verificar si necesitamos construir un almacén primero
        const storageNeeded = determineStorageNeeded(levels, storageLevels, resources);
        if (storageNeeded.needed && storageNeeded.storageType) {
          console.log(`\n⚠️ ¡ALMACÉN NECESARIO!`);
          console.log(`   - Tipo: ${storageNeeded.storageType}`);
          console.log(`   - Razón: ${storageNeeded.reason}`);
          
          const storageStats = getStorageUpgradeStats(storageNeeded.storageType, storageLevels[storageNeeded.storageType]);
          console.log(`   - Costo: ${storageStats.cost.metal} metal, ${storageStats.cost.crystal} cristal`);
          
          // Verificar si podemos pagar el almacén
          if (resources.metal >= storageStats.cost.metal && resources.crystal >= storageStats.cost.crystal) {
            console.log(`   ✅ Podemos pagar el almacén, navegando para construir...`);
            const buildSuccess = await buildStorage(storageNeeded.storageType);
            if (buildSuccess) {
              return { 
                success: true, 
                message: `Almacén de ${storageNeeded.storageType} construido. ${storageNeeded.reason}` 
              };
            } else {
              return { success: false, message: `Error al construir almacén de ${storageNeeded.storageType}` };
            }
          } else {
            console.log(`   ❌ No hay recursos suficientes para el almacén`);
            return { 
              success: false, 
              message: `Necesitas almacén de ${storageNeeded.storageType} pero faltan recursos (${storageStats.cost.metal} metal, ${storageStats.cost.crystal} cristal)` 
            };
          }
        }
      }

      // Calcular balance de energía actual
      const energyBalance = calculateEnergyBalance(levels);
      console.log('\n⚡ Balance de energía:');
      console.log(`   - Producción: ${energyBalance.production} (Solar: ${energyBalance.solarPlantProduction}, Satélites: ${energyBalance.solarSatelliteProduction})`);
      console.log(`   - Consumo: ${energyBalance.consumption}`);
      console.log(`   - Balance: ${energyBalance.balance}`);

      // Calcular ratio de producción
      const productionRatio = calculateProductionRatio(levels);
      console.log('\n📈 Ratio de producción:');
      console.log(`   - Metal: ${productionRatio.metalPercent.toFixed(1)}% (óptimo: ${OPTIMAL_RATIOS.metal}%)`);
      console.log(`   - Cristal: ${productionRatio.crystalPercent.toFixed(1)}% (óptimo: ${OPTIMAL_RATIOS.crystal}%)`);
      console.log(`   - Deuterio: ${productionRatio.deuteriumPercent.toFixed(1)}% (óptimo: ${OPTIMAL_RATIOS.deuterium}%)`);

      // Usar el algoritmo de decisión basado en fórmulas
      const decision = determineBestMineToBuild(levels, resources);

      console.log(`\n🎯 Decisión del algoritmo:`);
      console.log(`   - Recomendación: ${decision.recommendation || 'Ninguna'}`);
      console.log(`   - Razón: ${decision.reason}`);

      if (decision.stats) {
        console.log(`   - Costo: ${decision.stats.cost.metal} metal, ${decision.stats.cost.crystal} cristal`);
        if (decision.recommendation !== 'solar') {
          console.log(`   - Consumo energía: +${decision.stats.energyConsumption}`);
          console.log(`   - ROI: ${decision.stats.roi.toFixed(1)} horas`);
        } else {
          console.log(`   - Producción energía: +${decision.stats.energyProduction}`);
        }
      }

      if (decision.alternatives.length > 0) {
        console.log(`\n📋 Alternativas:`);
        for (const alt of decision.alternatives) {
          console.log(`   - ${alt.type}: ${alt.reason}`);
        }
      }

      if (!decision.recommendation) {
        return { 
          success: false, 
          message: decision.reason 
        };
      }

      // Si el algoritmo indica que no podemos pagar, no navegar
      if (decision.canAfford === false) {
        return {
          success: false,
          message: `Esperando recursos para ${decision.recommendation}. ${decision.reason}`
        };
      }

      // Verificación adicional de seguridad antes de navegar
      if (decision.stats) {
        const canAfford = resources.metal >= decision.stats.cost.metal && 
                          resources.crystal >= decision.stats.cost.crystal &&
                          resources.deuterium >= decision.stats.cost.deuterium;
        
        if (!canAfford) {
          const metalNeeded = Math.max(0, decision.stats.cost.metal - resources.metal);
          const crystalNeeded = Math.max(0, decision.stats.cost.crystal - resources.crystal);
          const deuteriumNeeded = Math.max(0, decision.stats.cost.deuterium - resources.deuterium);
          
          return {
            success: false,
            message: `Esperando recursos para ${decision.recommendation}. Faltan: ${metalNeeded > 0 ? metalNeeded.toLocaleString() + ' metal ' : ''}${crystalNeeded > 0 ? crystalNeeded.toLocaleString() + ' cristal ' : ''}${deuteriumNeeded > 0 ? deuteriumNeeded.toLocaleString() + ' deuterio' : ''}`.trim()
          };
        }
      }

      // Solo navegar cuando vamos a construir Y tenemos recursos
      console.log(`\n🔧 Navegando para construir ${decision.recommendation}...`);
      const buildSuccess = await buildMine(decision.recommendation);
      if (buildSuccess) {
        return { 
          success: true, 
          message: `${decision.recommendation.toUpperCase()} nivel ${decision.stats?.level} construida. ${decision.reason}` 
        };
      } else {
        return { 
          success: false, 
          message: `Error al construir ${decision.recommendation}` 
        };
      }

    } catch (error) {
      console.error('❌ Error en maximizar minas:', error);
      return { success: false, message: `Error en maximizar minas: ${error}` };
    }
  }
}

export const maximizeMinesPolicy = new MaximizeMinesPolicy();
