import { ogameClient } from '../browser/ogame-client.js';
import { Resources } from '../browser/ogame-client.js';
import {
  MineLevels,
  StorageLevels,
  determineBestMineToBuild,
  getMineUpgradeStats,
  calculateEnergyBalance,
  calculateProductionRatio,
  OPTIMAL_RATIOS,
  getStorageCapacities,
  determineStorageNeeded,
  getStorageUpgradeStats,
} from '../game/ogame-formulas.js';
import { expansionPolicy } from '../expansion/index.js';

export interface ScheduledTask {
  id: string;
  name: string;
  enabled: boolean;
  interval: number; // en minutos
  lastRun?: Date;
  nextRun?: Date;
}

export interface TaskResult {
  success: boolean;
  message: string;
  resources?: Resources;
}

export class TaskScheduler {
  private tasks: Map<string, ScheduledTask> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private isRunning = false;

  constructor() {
    this.setupDefaultTasks();
  }

  private setupDefaultTasks(): void {
    // Tarea de maximizar minas
    this.addTask({
      id: 'maximize-mines',
      name: 'Maximizar Minas',
      enabled: false,
      interval: 1, // cada 1 minuto
    });

    // Tarea de política expansionista
    this.addTask({
      id: 'expansion-policy',
      name: 'Política Expansionista',
      enabled: false,
      interval: 30, // cada 30 minutos
    });
  }

  addTask(task: ScheduledTask): void {
    this.tasks.set(task.id, task);
    if (task.enabled) {
      this.scheduleTask(task);
    }
  }

  removeTask(taskId: string): void {
    this.stopTask(taskId);
    this.tasks.delete(taskId);
  }

  getTasks(): ScheduledTask[] {
    return Array.from(this.tasks.values());
  }

  getTask(taskId: string): ScheduledTask | undefined {
    return this.tasks.get(taskId);
  }

  updateTask(taskId: string, updates: Partial<ScheduledTask>): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    const wasEnabled = task.enabled;
    Object.assign(task, updates);

    if (wasEnabled && !task.enabled) {
      this.stopTask(taskId);
    } else if (!wasEnabled && task.enabled) {
      this.scheduleTask(task);
    } else if (task.enabled) {
      // Reiniciar si el intervalo cambió
      this.stopTask(taskId);
      this.scheduleTask(task);
    }

    return true;
  }

  private scheduleTask(task: ScheduledTask): void {
    this.stopTask(task.id);

    const interval = setInterval(async () => {
      await this.executeTask(task.id);
    }, task.interval * 60 * 1000);

    this.intervals.set(task.id, interval);
    console.log(`⏰ Tarea "${task.name}" programada cada ${task.interval} minutos`);
  }

  private stopTask(taskId: string): void {
    const interval = this.intervals.get(taskId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(taskId);
      console.log(`⏹️ Tarea "${taskId}" detenida`);
    }
  }

  /**
   * Programa la siguiente ejecución de una tarea después de X segundos
   * Útil para esperar a que termine una construcción
   */
  private scheduleNextRun(taskId: string, delaySeconds: number): void {
    const task = this.tasks.get(taskId);
    if (!task) return;

    // Detener el intervalo actual
    this.stopTask(taskId);

    // Programar una ejecución única después del delay
    const timeout = setTimeout(async () => {
      await this.executeTask(taskId);
      
      // Después de ejecutar, volver al intervalo normal si la tarea sigue habilitada
      const currentTask = this.tasks.get(taskId);
      if (currentTask?.enabled) {
        this.scheduleTask(currentTask);
      }
    }, delaySeconds * 1000);

    // Guardar el timeout como si fuera un interval (para poder cancelarlo)
    this.intervals.set(taskId, timeout as unknown as NodeJS.Timeout);
    
    const minutes = Math.floor(delaySeconds / 60);
    const seconds = delaySeconds % 60;
    const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
    
    task.nextRun = new Date(Date.now() + delaySeconds * 1000);
    console.log(`⏰ Próxima ejecución de "${task.name}" programada en ${timeStr}`);
  }

  async executeTask(taskId: string): Promise<TaskResult> {
    const task = this.tasks.get(taskId);
    if (!task) {
      return { success: false, message: 'Tarea no encontrada' };
    }

    // No ejecutar si el scheduler está parado
    if (!this.isRunning) {
      return { success: false, message: 'Scheduler parado - no se ejecuta la tarea' };
    }

    if (!ogameClient.getLoginStatus()) {
      return { success: false, message: 'No hay sesión activa en OGame' };
    }

    console.log(`🚀 Ejecutando tarea: ${task.name}`);
    task.lastRun = new Date();
    task.nextRun = new Date(Date.now() + task.interval * 60 * 1000);

    try {
      switch (taskId) {
        case 'maximize-mines':
          return await this.executeMaximizeMines();
        case 'expansion-policy':
          return await this.executeExpansionPolicy();
        default:
          return { success: false, message: 'Tarea desconocida' };
      }
    } catch (error) {
      console.error(`❌ Error ejecutando tarea ${task.name}:`, error);
      return { success: false, message: `Error: ${error}` };
    }
  }

  private async executeMaximizeMines(): Promise<TaskResult> {
    try {
      // Obtener recursos actuales
      const resources = await ogameClient.getResources();
      if (!resources) {
        return { success: false, message: 'No se pudieron obtener los recursos' };
      }

      console.log('\n📊 ========== MAXIMIZAR MINAS ==========');
      console.log(`💰 Recursos actuales:`);
      console.log(`   - Metal: ${resources.metal}`);
      console.log(`   - Cristal: ${resources.crystal}`);
      console.log(`   - Deuterio: ${resources.deuterium}`);
      console.log(`   - Energía: ${resources.energy}`);

      // Navegar a la sección de recursos
      await ogameClient.navigateTo('resources');
      await ogameClient.page?.waitForTimeout(2000);

      // Verificar si hay algo en producción
      const productionStatus = await this.checkIfSomethingInProduction();
      if (productionStatus.inProduction) {
        // Programar la siguiente ejecución para cuando termine la construcción
        const waitSeconds = productionStatus.remainingSeconds + 10; // +10 segundos de margen
        this.scheduleNextRun('maximize-mines', waitSeconds);
        
        return { 
          success: false, 
          message: `Construcción en curso. Próxima verificación en ${Math.ceil(waitSeconds / 60)} minutos`, 
          resources 
        };
      }

      // Obtener niveles actuales de las minas
      const levels = await this.getMineLevels();
      if (!levels) {
        return { success: false, message: 'No se pudieron obtener los niveles de las minas' };
      }

      console.log(`\n🏭 Niveles actuales de minas:`);
      console.log(`   - Metal: ${levels.metal}`);
      console.log(`   - Cristal: ${levels.crystal}`);
      console.log(`   - Deuterio: ${levels.deuterium}`);
      console.log(`   - Planta Solar: ${levels.solar}`);

      // Obtener niveles de almacenes
      const storageLevels = await this.getStorageLevels();
      if (!storageLevels) {
        return { success: false, message: 'No se pudieron obtener los niveles de los almacenes' };
      }

      const storageCapacities = getStorageCapacities(storageLevels);
      console.log(`\n📦 Almacenes:`);
      console.log(`   - Metal: nivel ${storageLevels.metal} (capacidad: ${storageCapacities.metal.toLocaleString()})`);
      console.log(`   - Cristal: nivel ${storageLevels.crystal} (capacidad: ${storageCapacities.crystal.toLocaleString()})`);
      console.log(`   - Deuterio: nivel ${storageLevels.deuterium} (capacidad: ${storageCapacities.deuterium.toLocaleString()})`);

      // Verificar si necesitamos construir un almacén primero
      const storageNeeded = determineStorageNeeded(levels, storageLevels, resources);
      if (storageNeeded.needed && storageNeeded.storageType && storageNeeded.stats) {
        console.log(`\n⚠️ ¡ALMACÉN NECESARIO!`);
        console.log(`   - Tipo: ${storageNeeded.storageType}`);
        console.log(`   - Razón: ${storageNeeded.reason}`);
        console.log(`   - Costo: ${storageNeeded.stats.cost.metal} metal, ${storageNeeded.stats.cost.crystal} cristal`);
        console.log(`   - Nueva capacidad: ${storageNeeded.stats.newCapacity.toLocaleString()}`);

        // Verificar si podemos pagar el almacén
        const canAffordStorage = resources.metal >= storageNeeded.stats.cost.metal &&
                                  resources.crystal >= storageNeeded.stats.cost.crystal;

        if (canAffordStorage) {
          console.log(`   ✅ Podemos pagar el almacén, construyendo...`);
          const buildSuccess = await this.buildStorage(storageNeeded.storageType);
          if (buildSuccess) {
            return {
              success: true,
              message: `Almacén de ${storageNeeded.storageType} nivel ${storageNeeded.stats.level} construido. ${storageNeeded.reason}`,
              resources
            };
          } else {
            return {
              success: false,
              message: `Error al construir almacén de ${storageNeeded.storageType}`,
              resources
            };
          }
        } else {
          console.log(`   ❌ No hay recursos suficientes para el almacén`);
          console.log(`   Esperando recursos: necesitas ${storageNeeded.stats.cost.metal} metal, ${storageNeeded.stats.cost.crystal} cristal`);
          return {
            success: false,
            message: `Necesitas almacén de ${storageNeeded.storageType} pero no hay recursos suficientes`,
            resources
          };
        }
      }

      // Calcular balance de energía actual
      const energyBalance = calculateEnergyBalance(levels);
      console.log(`\n⚡ Balance de energía:`);
      console.log(`   - Planta Solar: ${energyBalance.solarPlantProduction}`);
      console.log(`   - Satélites Solares (${levels.solarSatellites}): ${energyBalance.solarSatelliteProduction}`);
      console.log(`   - Producción Total: ${energyBalance.production}`);
      console.log(`   - Consumo: ${energyBalance.consumption}`);
      console.log(`   - Balance: ${energyBalance.balance}`);

      // Calcular ratio de producción
      const productionRatio = calculateProductionRatio(levels);
      console.log(`\n📈 Ratio de producción actual:`);
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
          message: decision.reason, 
          resources 
        };
      }

      // Construir la mina recomendada
      const buildSuccess = await this.buildMine(decision.recommendation);
      if (buildSuccess) {
        return { 
          success: true, 
          message: `${decision.recommendation.toUpperCase()} nivel ${decision.stats?.level} construida. ${decision.reason}`, 
          resources 
        };
      } else {
        return { 
          success: false, 
          message: `Error al construir ${decision.recommendation}`, 
          resources 
        };
      }

    } catch (error) {
      return { 
        success: false, 
        message: `Error en maximizar minas: ${error}` 
      };
    }
  }

  private async getMineLevels(): Promise<MineLevels | null> {
    if (!ogameClient.page) return null;

    try {
      console.log('\n🔍 Obteniendo niveles de las minas...');

      // Asegurarse de estar en la página de supplies
      const currentUrl = ogameClient.page.url();
      if (!currentUrl.includes('component=supplies')) {
        await ogameClient.navigateTo('resources');
        await ogameClient.page.waitForTimeout(2000);
      }

      const levels: MineLevels = {
        metal: 0,
        crystal: 0,
        deuterium: 0,
        solar: 0,
        solarSatellites: 0,
      };

      // Selectores para obtener el nivel de cada mina
      const mineSelectors = {
        metal: 'li.metalMine .level',
        crystal: 'li.crystalMine .level',
        deuterium: 'li.deuteriumSynthesizer .level',
        solar: 'li.solarPlant .level',
      };

      for (const [mineType, selector] of Object.entries(mineSelectors)) {
        try {
          const levelElement = ogameClient.page.locator(selector).first();
          if (await levelElement.isVisible({ timeout: 2000 }).catch(() => false)) {
            const levelText = await levelElement.textContent() || '0';
            const level = parseInt(levelText.replace(/\D/g, '')) || 0;
            levels[mineType as keyof MineLevels] = level;
            console.log(`   - ${mineType}: nivel ${level}`);
          }
        } catch {
          console.log(`   - ${mineType}: no encontrado, asumiendo nivel 0`);
        }
      }

      // Si no encontramos niveles con el selector .level, intentar con data-value
      if (levels.metal === 0 && levels.crystal === 0) {
        console.log('🔍 Intentando obtener niveles con selector alternativo...');
        
        const altSelectors = {
          metal: 'li.metalMine [data-value]',
          crystal: 'li.crystalMine [data-value]',
          deuterium: 'li.deuteriumSynthesizer [data-value]',
          solar: 'li.solarPlant [data-value]',
        };

        for (const [mineType, selector] of Object.entries(altSelectors)) {
          try {
            const element = ogameClient.page.locator(selector).first();
            if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
              const value = await element.getAttribute('data-value') || '0';
              const level = parseInt(value) || 0;
              if (level > 0) {
                levels[mineType as keyof MineLevels] = level;
                console.log(`   - ${mineType}: nivel ${level} (alt)`);
              }
            }
          } catch {
            // Ignorar
          }
        }
      }

      // Si aún no tenemos niveles, intentar extraerlos del texto visible
      if (levels.metal === 0 && levels.crystal === 0) {
        console.log('🔍 Intentando obtener niveles del texto visible...');
        
        const mineElements = {
          metal: 'li.metalMine',
          crystal: 'li.crystalMine',
          deuterium: 'li.deuteriumSynthesizer',
          solar: 'li.solarPlant',
        };

        for (const [mineType, selector] of Object.entries(mineElements)) {
          try {
            const element = ogameClient.page.locator(selector).first();
            if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
              const text = await element.textContent() || '';
              // Buscar número en el texto (el nivel suele aparecer como un número)
              const match = text.match(/(\d+)/);
              if (match) {
                const level = parseInt(match[1]);
                if (level > 0 && level < 100) { // Sanity check
                  levels[mineType as keyof MineLevels] = level;
                  console.log(`   - ${mineType}: nivel ${level} (texto)`);
                }
              }
            }
          } catch {
            // Ignorar
          }
        }
      }

      // Obtener cantidad de satélites solares desde la página de resourcesettings
      levels.solarSatellites = await this.getSolarSatelliteCount();
      console.log(`   - solarSatellites: ${levels.solarSatellites}`);

      return levels;
    } catch (error) {
      console.error('❌ Error obteniendo niveles de minas:', error);
      return null;
    }
  }

  private async getSolarSatelliteCount(): Promise<number> {
    if (!ogameClient.page) return 0;

    try {
      // Navegar a la página de resourcesettings para obtener la cantidad de satélites solares
      const currentUrl = ogameClient.page.url();
      if (!currentUrl.includes('component=resourcesettings')) {
        await ogameClient.page.goto(currentUrl.split('?')[0] + '?page=ingame&component=resourcesettings');
        await ogameClient.page.waitForLoadState('networkidle');
        await ogameClient.page.waitForTimeout(1000);
      }

      // Buscar la fila de "Satélite solar" en la tabla de resourcesettings
      // El texto puede ser "Satélite solar (Cantidad: X)" donde X es el número de satélites
      const satelliteRow = ogameClient.page.locator('tr:has-text("Satélite solar"), tr:has-text("Solar Satellite")').first();
      
      if (await satelliteRow.isVisible({ timeout: 3000 }).catch(() => false)) {
        const rowText = await satelliteRow.textContent() || '';
        // Buscar el patrón "Cantidad: X" o "(X)" en el texto
        const quantityMatch = rowText.match(/Cantidad:\s*(\d+)/i) || rowText.match(/\((\d+)\)/);
        if (quantityMatch) {
          const count = parseInt(quantityMatch[1]) || 0;
          return count;
        }
      }

      // Método alternativo: buscar en el selector específico de la tabla
      const satelliteCell = ogameClient.page.locator('table tr').filter({ hasText: /Satélite solar|Solar Satellite/ }).first();
      if (await satelliteCell.isVisible({ timeout: 2000 }).catch(() => false)) {
        const cellText = await satelliteCell.textContent() || '';
        const match = cellText.match(/Cantidad:\s*(\d+)/i) || cellText.match(/\((\d+)\)/);
        if (match) {
          return parseInt(match[1]) || 0;
        }
      }

      return 0;
    } catch (error) {
      console.error('❌ Error obteniendo cantidad de satélites solares:', error);
      return 0;
    }
  }

  private async getStorageLevels(): Promise<StorageLevels | null> {
    if (!ogameClient.page) return null;

    try {
      console.log('\n🔍 Obteniendo niveles de los almacenes...');

      // Asegurarse de estar en la página de supplies
      const currentUrl = ogameClient.page.url();
      if (!currentUrl.includes('component=supplies')) {
        await ogameClient.navigateTo('resources');
        await ogameClient.page.waitForTimeout(2000);
      }

      const levels: StorageLevels = {
        metal: 0,
        crystal: 0,
        deuterium: 0,
      };

      // Selectores para obtener el nivel de cada almacén
      const storageSelectors = {
        metal: 'li.metalStorage .level',
        crystal: 'li.crystalStorage .level',
        deuterium: 'li.deuteriumStorage .level',
      };

      for (const [storageType, selector] of Object.entries(storageSelectors)) {
        try {
          const levelElement = ogameClient.page.locator(selector).first();
          if (await levelElement.isVisible({ timeout: 2000 }).catch(() => false)) {
            const levelText = await levelElement.textContent() || '0';
            const level = parseInt(levelText.replace(/\D/g, '')) || 0;
            levels[storageType as keyof StorageLevels] = level;
            console.log(`   - ${storageType}: nivel ${level}`);
          }
        } catch {
          console.log(`   - ${storageType}: no encontrado, asumiendo nivel 0`);
        }
      }

      // Si no encontramos niveles con el selector .level, intentar con data-value
      if (levels.metal === 0 && levels.crystal === 0 && levels.deuterium === 0) {
        console.log('🔍 Intentando obtener niveles de almacenes con selector alternativo...');
        
        const altSelectors = {
          metal: 'li.metalStorage [data-value]',
          crystal: 'li.crystalStorage [data-value]',
          deuterium: 'li.deuteriumStorage [data-value]',
        };

        for (const [storageType, selector] of Object.entries(altSelectors)) {
          try {
            const element = ogameClient.page.locator(selector).first();
            if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
              const value = await element.getAttribute('data-value') || '0';
              const level = parseInt(value) || 0;
              if (level > 0) {
                levels[storageType as keyof StorageLevels] = level;
                console.log(`   - ${storageType}: nivel ${level} (alt)`);
              }
            }
          } catch {
            // Ignorar
          }
        }
      }

      // Si aún no tenemos niveles, intentar extraerlos del texto visible
      if (levels.metal === 0 && levels.crystal === 0 && levels.deuterium === 0) {
        console.log('🔍 Intentando obtener niveles de almacenes del texto visible...');
        
        const storageElements = {
          metal: 'li.metalStorage',
          crystal: 'li.crystalStorage',
          deuterium: 'li.deuteriumStorage',
        };

        for (const [storageType, selector] of Object.entries(storageElements)) {
          try {
            const element = ogameClient.page.locator(selector).first();
            if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
              const text = await element.textContent() || '';
              const match = text.match(/(\d+)/);
              if (match) {
                const level = parseInt(match[1]);
                if (level >= 0 && level < 50) { // Sanity check
                  levels[storageType as keyof StorageLevels] = level;
                  console.log(`   - ${storageType}: nivel ${level} (texto)`);
                }
              }
            }
          } catch {
            // Ignorar
          }
        }
      }

      return levels;
    } catch (error) {
      console.error('❌ Error obteniendo niveles de almacenes:', error);
      return null;
    }
  }

  private async buildStorage(storageType: 'metal' | 'crystal' | 'deuterium'): Promise<boolean> {
    if (!ogameClient.page) return false;

    try {
      console.log(`🏗️ Intentando construir almacén de ${storageType}...`);

      // Asegurarse de estar en la página de supplies
      const currentUrl = ogameClient.page.url();
      if (!currentUrl.includes('component=supplies')) {
        console.log('🔍 Navegando a página de recursos...');
        await ogameClient.navigateTo('resources');
        await ogameClient.page.waitForTimeout(3000);
      }

      // Selectores CSS para cada almacén
      const storageSelectors: Record<string, string> = {
        metal: 'li.metalStorage',
        crystal: 'li.crystalStorage',
        deuterium: 'li.deuteriumStorage',
      };

      const selector = storageSelectors[storageType];
      if (!selector) {
        console.log(`❌ Tipo de almacén desconocido: ${storageType}`);
        return false;
      }

      // Hacer click en el almacén para abrir el panel de detalles
      const storageElement = ogameClient.page.locator(selector).first();
      
      if (await storageElement.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log(`🎯 Haciendo click en almacén de ${storageType} para ver detalles...`);
        await storageElement.click();
        await ogameClient.page.waitForTimeout(2000);
        
        // Esperar a que aparezca el panel de detalles
        const detailsPanelSelectors = [
          '#technologydetails',
          '.detail_content',
          '.technology_detail',
          '[id*="details"]',
        ];
        
        let panelFound = false;
        for (const panelSelector of detailsPanelSelectors) {
          const panel = ogameClient.page.locator(panelSelector).first();
          if (await panel.isVisible({ timeout: 2000 }).catch(() => false)) {
            console.log(`✅ Panel de detalles encontrado: ${panelSelector}`);
            panelFound = true;
            break;
          }
        }

        if (!panelFound) {
          console.log('⚠️ Panel de detalles no encontrado, intentando click de nuevo...');
          await storageElement.click();
          await ogameClient.page.waitForTimeout(3000);
        }

        // Tomar screenshot para debug
        await ogameClient.page.screenshot({ path: `build-storage-${storageType}-details.png` });

        // Buscar el botón de "Mejorar" o "Upgrade"
        const upgradeButtonSelectors = [
          'button.upgrade',
          'a.upgrade',
          'button:has-text("Mejorar")',
          'a:has-text("Mejorar")',
          'button:has-text("Upgrade")',
          'a:has-text("Upgrade")',
          '.upgrade_building',
          '[class*="upgrade"]',
        ];

        for (const buttonSelector of upgradeButtonSelectors) {
          const button = ogameClient.page.locator(buttonSelector).first();
          
          if (await button.isVisible({ timeout: 2000 }).catch(() => false)) {
            const buttonText = await button.textContent() || '';
            const buttonClass = await button.getAttribute('class') || '';
            console.log(`🔍 Botón encontrado: "${buttonText.trim()}" (clase: ${buttonClass})`);
            
            const isDisabled = await button.getAttribute('disabled') !== null ||
                              buttonClass.includes('disabled') ||
                              buttonClass.includes('off');
            
            if (!isDisabled) {
              console.log(`✅ Botón habilitado, haciendo click...`);
              await button.click();
              console.log(`🏗️ ¡Click en Mejorar almacén de ${storageType}!`);
              await ogameClient.page.waitForTimeout(2000);
              
              await ogameClient.page.screenshot({ path: `build-storage-${storageType}-after.png` });
              
              return true;
            } else {
              console.log(`⚠️ Botón está deshabilitado (clase: ${buttonClass})`);
            }
          }
        }

        // Si no encontramos con los selectores anteriores, buscar cualquier botón verde visible
        console.log('🔍 Buscando cualquier botón verde visible...');
        const allButtons = await ogameClient.page.locator('button, a.button, a[role="button"]').all();
        
        for (const button of allButtons) {
          const text = await button.textContent() || '';
          const isVisible = await button.isVisible().catch(() => false);
          
          if (isVisible && (text.includes('Mejorar') || text.includes('Upgrade') || text.includes('Build'))) {
            console.log(`🔍 Botón alternativo encontrado: "${text}"`);
            await button.click();
            console.log(`🏗️ ¡Click en botón alternativo para almacén de ${storageType}!`);
            await ogameClient.page.waitForTimeout(2000);
            await ogameClient.page.screenshot({ path: `build-storage-${storageType}-after.png` });
            return true;
          }
        }

        console.log(`❌ No se encontró botón de Mejorar para almacén de ${storageType}`);
        return false;
      } else {
        console.log(`❌ No se encontró elemento para almacén de ${storageType}`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Error construyendo almacén de ${storageType}:`, error);
      return false;
    }
  }

  /**
   * Verifica si hay algo en producción y devuelve la duración restante en segundos
   * @returns { inProduction: boolean, remainingSeconds: number }
   */
  private async checkIfSomethingInProduction(): Promise<{ inProduction: boolean; remainingSeconds: number }> {
    if (!ogameClient.page) return { inProduction: false, remainingSeconds: 0 };

    try {
      console.log('🔍 Verificando si hay algo en producción...');

      // Asegurarse de estar en la página de supplies
      const currentUrl = ogameClient.page.url();
      if (!currentUrl.includes('component=supplies')) {
        console.log('🔍 Navegando a página de recursos para verificar producción...');
        await ogameClient.navigateTo('resources');
        await ogameClient.page.waitForTimeout(2000);
      }

      // MÉTODO PRINCIPAL: Buscar el texto "No hay edificios en construcción"
      const noConstructionTexts = [
        'No hay edificios en construcción',
        'No buildings under construction',
        'Keine Gebäude im Bau',
      ];

      for (const text of noConstructionTexts) {
        const noConstructionElement = ogameClient.page.getByText(text, { exact: false });
        const isVisible = await noConstructionElement.isVisible({ timeout: 1000 }).catch(() => false);
        
        if (isVisible) {
          console.log(`✅ Texto "${text}" encontrado - NO hay construcción en curso`);
          return { inProduction: false, remainingSeconds: 0 };
        }
      }

      // Si hay construcción, intentar extraer la duración restante
      // Buscar el texto de duración en formato "Xm Ys" o "Xh Ym Zs"
      let remainingSeconds = 0;

      // Buscar el elemento que contiene la duración
      const durationSelectors = [
        '#buildingCountdown',
        '.buildingCountdown',
        '.countdown',
        '.timer',
      ];

      for (const selector of durationSelectors) {
        const element = ogameClient.page.locator(selector).first();
        const isVisible = await element.isVisible({ timeout: 500 }).catch(() => false);
        
        if (isVisible) {
          const text = await element.textContent() || '';
          remainingSeconds = this.parseDuration(text);
          if (remainingSeconds > 0) {
            console.log(`⏱️ Duración encontrada (${selector}): "${text}" = ${remainingSeconds} segundos`);
            break;
          }
        }
      }

      // Si no encontramos con selectores, buscar por texto visible
      if (remainingSeconds === 0) {
        // Buscar texto que contenga formato de tiempo como "1m 23s" o "2h 30m"
        const pageContent = await ogameClient.page.content();
        
        // Patrón para tiempo en el bloque de edificio: buscar cerca de "Duración:"
        const durationMatch = pageContent.match(/Duración:\s*<[^>]*>?\s*(\d+[hms]\s*\d*[hms]?\s*\d*[hms]?)/i) ||
                              pageContent.match(/(\d+h\s+\d+m\s+\d+s|\d+m\s+\d+s|\d+h\s+\d+m|\d+s)/);
        
        if (durationMatch) {
          remainingSeconds = this.parseDuration(durationMatch[1] || durationMatch[0]);
          console.log(`⏱️ Duración encontrada en contenido: "${durationMatch[0]}" = ${remainingSeconds} segundos`);
        }
      }

      // Si aún no tenemos duración, buscar el texto visible directamente
      if (remainingSeconds === 0) {
        const timePatterns = ['1m', '2m', '3m', '4m', '5m', '10m', '15m', '20m', '30m', '1h'];
        for (const pattern of timePatterns) {
          const timeElement = ogameClient.page.getByText(new RegExp(`\\d+[hms]\\s*\\d*[hms]?`), { exact: false }).first();
          const isVisible = await timeElement.isVisible({ timeout: 300 }).catch(() => false);
          
          if (isVisible) {
            const text = await timeElement.textContent() || '';
            remainingSeconds = this.parseDuration(text);
            if (remainingSeconds > 0) {
              console.log(`⏱️ Duración encontrada por patrón: "${text}" = ${remainingSeconds} segundos`);
              break;
            }
          }
        }
      }

      // Si hay construcción pero no pudimos extraer duración, usar 60 segundos por defecto
      if (remainingSeconds === 0) {
        remainingSeconds = 60;
        console.log(`⚠️ No se pudo extraer duración, usando 60 segundos por defecto`);
      }

      console.log(`� HAY producción en curso. Tiempo restante: ${remainingSeconds} segundos`);
      return { inProduction: true, remainingSeconds };

    } catch (error) {
      console.error('❌ Error verificando producción:', error);
      return { inProduction: false, remainingSeconds: 0 };
    }
  }

  /**
   * Parsea una cadena de duración y devuelve los segundos totales
   * Soporta formatos: "1m 23s", "2h 30m", "45s", "1h 2m 3s"
   */
  private parseDuration(durationText: string): number {
    let totalSeconds = 0;
    
    // Extraer horas
    const hoursMatch = durationText.match(/(\d+)\s*h/i);
    if (hoursMatch) {
      totalSeconds += parseInt(hoursMatch[1]) * 3600;
    }
    
    // Extraer minutos
    const minutesMatch = durationText.match(/(\d+)\s*m/i);
    if (minutesMatch) {
      totalSeconds += parseInt(minutesMatch[1]) * 60;
    }
    
    // Extraer segundos
    const secondsMatch = durationText.match(/(\d+)\s*s/i);
    if (secondsMatch) {
      totalSeconds += parseInt(secondsMatch[1]);
    }
    
    return totalSeconds;
  }

  private async buildMine(mineType: string): Promise<boolean> {
    if (!ogameClient.page) return false;

    try {
      console.log(`🏗️ Intentando construir/mejorar ${mineType}...`);

      // Asegurarse de estar en la página de supplies
      const currentUrl = ogameClient.page.url();
      if (!currentUrl.includes('component=supplies')) {
        console.log('🔍 Navegando a página de recursos...');
        await ogameClient.navigateTo('resources');
        await ogameClient.page.waitForTimeout(3000);
      }

      // Selectores CSS para cada mina
      const mineSelectors: Record<string, string> = {
        metal: 'li.metalMine',
        crystal: 'li.crystalMine',
        deuterium: 'li.deuteriumSynthesizer',
        energy: 'li.solarPlant',
        solar: 'li.solarPlant', // Alias para compatibilidad
      };

      const selector = mineSelectors[mineType];
      if (!selector) {
        console.log(`❌ Tipo de mina desconocido: ${mineType}`);
        return false;
      }

      // Hacer click en la mina para abrir el panel de detalles
      const mineElement = ogameClient.page.locator(selector).first();
      
      if (await mineElement.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log(`🎯 Haciendo click en ${mineType} para ver detalles...`);
        await mineElement.click();
        await ogameClient.page.waitForTimeout(2000);
        
        // Esperar a que aparezca el panel de detalles (tiene clase específica)
        const detailsPanelSelectors = [
          '#technologydetails',
          '.detail_content',
          '.technology_detail',
          '[id*="details"]',
        ];
        
        let panelFound = false;
        for (const panelSelector of detailsPanelSelectors) {
          const panel = ogameClient.page.locator(panelSelector).first();
          if (await panel.isVisible({ timeout: 2000 }).catch(() => false)) {
            console.log(`✅ Panel de detalles encontrado: ${panelSelector}`);
            panelFound = true;
            break;
          }
        }
        
        if (!panelFound) {
          console.log('⚠️ Panel de detalles no encontrado, intentando click de nuevo...');
          await mineElement.click();
          await ogameClient.page.waitForTimeout(3000);
        }
        
        // Tomar screenshot para debug
        await ogameClient.page.screenshot({ path: `build-${mineType}-details.png` });
        
        // Esperar a que aparezca el panel de detalles con el botón Mejorar
        // El botón "Mejorar" es verde y tiene clase específica
        const upgradeButtonSelectors = [
          'button.upgrade:has-text("Mejorar")',
          'button:has-text("Mejorar")',
          'a.upgrade:has-text("Mejorar")',
          'a:has-text("Mejorar")',
          '.upgrade button',
          '.build-it_wrap button',
          '.build-it_wrap a',
          'button.upgrade',
          'a.upgrade',
          '[class*="upgrade"]:has-text("Mejorar")',
          '[class*="upgrade"]:has-text("Upgrade")',
        ];

        console.log('🔍 Buscando botón Mejorar...');

        for (const btnSelector of upgradeButtonSelectors) {
          const button = ogameClient.page.locator(btnSelector).first();
          
          if (await button.isVisible({ timeout: 2000 }).catch(() => false)) {
            const buttonText = await button.textContent() || '';
            const buttonClass = await button.getAttribute('class') || '';
            console.log(`🔍 Botón encontrado: selector="${btnSelector}", texto="${buttonText}", clase="${buttonClass}"`);
            
            // Verificar que el botón no esté deshabilitado
            const isDisabled = await button.getAttribute('disabled') !== null ||
                              buttonClass.includes('disabled') ||
                              buttonClass.includes('off');
            
            if (!isDisabled) {
              console.log(`✅ Botón habilitado, haciendo click...`);
              await button.click();
              console.log(`🏗️ ¡Click en Mejorar ${mineType}!`);
              await ogameClient.page.waitForTimeout(2000);
              
              // Tomar screenshot después de construir
              await ogameClient.page.screenshot({ path: `build-${mineType}-after.png` });
              
              return true;
            } else {
              console.log(`⚠️ Botón está deshabilitado (clase: ${buttonClass})`);
            }
          }
        }

        // Si no encontramos con los selectores anteriores, buscar cualquier botón verde visible
        console.log('🔍 Buscando cualquier botón verde visible...');
        const allButtons = await ogameClient.page.locator('button, a.button, a[role="button"]').all();
        
        for (const button of allButtons) {
          const text = await button.textContent() || '';
          const isVisible = await button.isVisible().catch(() => false);
          
          if (isVisible && (text.includes('Mejorar') || text.includes('Upgrade') || text.includes('Build'))) {
            console.log(`🔍 Botón alternativo encontrado: "${text}"`);
            await button.click();
            console.log(`🏗️ ¡Click en botón alternativo para ${mineType}!`);
            await ogameClient.page.waitForTimeout(2000);
            await ogameClient.page.screenshot({ path: `build-${mineType}-after.png` });
            return true;
          }
        }

        console.log(`❌ No se encontró botón de Mejorar para ${mineType}`);
        
        // Listar todos los botones visibles para debug
        console.log('🔍 Botones visibles en la página:');
        for (const button of allButtons.slice(0, 10)) {
          const text = await button.textContent() || '';
          const isVisible = await button.isVisible().catch(() => false);
          if (isVisible && text.trim()) {
            console.log(`   - "${text.trim().substring(0, 50)}"`);
          }
        }
        
        return false;
      } else {
        console.log(`❌ No se encontró elemento para ${mineType}`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Error construyendo mina de ${mineType}:`, error);
      return false;
    }
  }

  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('🚀 Scheduler iniciado');

    // Iniciar todas las tareas habilitadas
    for (const task of this.tasks.values()) {
      if (task.enabled) {
        this.scheduleTask(task);
      }
    }
  }

  stop(): void {
    if (!this.isRunning) return;

    // Detener todas las tareas
    for (const taskId of this.intervals.keys()) {
      this.stopTask(taskId);
    }

    this.isRunning = false;
    console.log('⏹️ Scheduler detenido');
  }

  getStatus(): { isRunning: boolean; tasks: ScheduledTask[] } {
    return {
      isRunning: this.isRunning,
      tasks: this.getTasks(),
    };
  }

  private async executeExpansionPolicy(): Promise<TaskResult> {
    try {
      console.log('\n🌍 ========== POLÍTICA EXPANSIONISTA ==========');

      // Habilitar temporalmente la política para esta ejecución
      const currentConfig = expansionPolicy.getConfig();
      if (!currentConfig.enabled) {
        expansionPolicy.updateConfig({ enabled: true });
      }

      const result = await expansionPolicy.execute();

      // Restaurar estado original
      if (!currentConfig.enabled) {
        expansionPolicy.updateConfig({ enabled: false });
      }

      const resources = await ogameClient.getResources();

      return {
        success: result.success,
        message: result.message,
        resources: resources || undefined,
      };
    } catch (error) {
      console.error('❌ Error en política expansionista:', error);
      return {
        success: false,
        message: `Error en política expansionista: ${error}`,
      };
    }
  }
}

export const taskScheduler = new TaskScheduler();
