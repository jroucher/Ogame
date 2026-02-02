/**
 * Servicio de sincronización de datos del juego
 * Obtiene y cachea datos del juego para que las tareas programadas los usen
 */

import { ogameClient } from '../browser/ogame-client.js';
import { MineLevels, StorageLevels } from '../game/ogame-formulas.js';
import {
  GameData,
  DataSyncConfig,
  DEFAULT_DATA_SYNC_CONFIG,
  PlanetGameData,
  TechnologyLevels,
  ProductionQueue,
} from './game-data.types.js';
import { ogameApi } from './ogame-api.js';

export class GameDataService {
  private config: DataSyncConfig = { ...DEFAULT_DATA_SYNC_CONFIG };
  private gameData: GameData = {
    lastUpdate: new Date(0),
    isUpdating: false,
    planets: [],
    technologies: {},
    productionQueue: null,
    currentPlanetId: null,
  };
  private syncInterval: NodeJS.Timeout | null = null;
  private syncCount: number = 0;
  private readonly TECH_SYNC_INTERVAL = 10; // Sincronizar tecnologías cada N sincronizaciones

  getConfig(): DataSyncConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<DataSyncConfig>): DataSyncConfig {
    this.config = { ...this.config, ...updates };
    
    // Si se cambia el estado enabled, iniciar o detener el sync
    if ('enabled' in updates) {
      if (this.config.enabled) {
        this.startSync();
      } else {
        this.stopSync();
      }
    }
    
    // Si se cambia el intervalo y está activo, reiniciar
    if ('intervalSeconds' in updates && this.config.enabled) {
      this.stopSync();
      this.startSync();
    }
    
    return this.getConfig();
  }

  startSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    console.log(`🔄 Iniciando sincronización de datos cada ${this.config.intervalSeconds} segundos`);
    
    // Ejecutar inmediatamente
    this.syncAllData();
    
    // Programar siguiente ejecución
    this.syncInterval = setInterval(() => {
      this.syncAllData();
    }, this.config.intervalSeconds * 1000);
  }

  stopSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('⏹️ Sincronización de datos detenida');
    }
  }

  async syncAllData(): Promise<GameData> {
    if (!ogameClient.getLoginStatus()) {
      console.log('⚠️ No hay sesión activa, no se puede sincronizar datos');
      return this.gameData;
    }

    if (this.gameData.isUpdating) {
      console.log('⚠️ Ya hay una sincronización en curso');
      return this.gameData;
    }

    try {
      this.gameData.isUpdating = true;
      
      // Usar la nueva API para obtener todos los datos
      const gameData = await ogameApi.getAllGameData();

      const { resources, currentPlanet, buildings, storages, technologies, productionQueue } = gameData;

      // Obtener información del planeta actual
      const planetId = currentPlanet?.id || 'planet-1';
      const planetName = currentPlanet?.name || 'Planeta Principal';
      const planetCoords = currentPlanet?.coordinates || '[1:1:1]';

      // Actualizar datos del planeta actual
      if (resources && buildings) {
        const planetData: PlanetGameData = {
          id: planetId,
          name: planetName,
          coordinates: planetCoords,
          mineLevels: buildings,
          storageLevels: storages || { metal: 0, crystal: 0, deuterium: 0 },
          resources: {
            metal: resources.metal,
            crystal: resources.crystal,
            deuterium: resources.deuterium,
            energy: resources.energy,
          },
        };

        // Actualizar o añadir planeta en el array
        const existingIndex = this.gameData.planets.findIndex(p => p.id === planetId);
        if (existingIndex >= 0) {
          this.gameData.planets[existingIndex] = planetData;
        } else {
          this.gameData.planets.push(planetData);
        }
        
        this.gameData.currentPlanetId = planetId;

        console.log(`📊 Datos sincronizados para ${planetName} ${planetCoords}:`);
        console.log(`   - Metal: ${resources.metal.toLocaleString()}`);
        console.log(`   - Cristal: ${resources.crystal.toLocaleString()}`);
        console.log(`   - Deuterio: ${resources.deuterium.toLocaleString()}`);
        console.log(`   - Energía: ${resources.energy}`);
        console.log(`   - Mina Metal: ${buildings.metal}`);
        console.log(`   - Mina Cristal: ${buildings.crystal}`);
        console.log(`   - Sintetizador Deuterio: ${buildings.deuterium}`);
        console.log(`   - Planta Solar: ${buildings.solar}`);
        console.log(`   - Satélites Solares: ${buildings.solarSatellites}`);
        console.log(`   - Almacén Metal: ${planetData.storageLevels.metal}`);
        console.log(`   - Almacén Cristal: ${planetData.storageLevels.crystal}`);
        console.log(`   - Almacén Deuterio: ${planetData.storageLevels.deuterium}`);
      }

      // Sincronizar tecnologías si está habilitado
      if (this.config.syncTechnologies) {
        if (technologies && Object.keys(technologies).length > 0) {
          this.gameData.technologies = technologies;
          console.log(`🔬 ${Object.keys(technologies).length} tecnologías sincronizadas`);
        } else if (this.syncCount % this.TECH_SYNC_INTERVAL === 0) {
          // Cada N sincronizaciones, navegar a research para obtener tecnologías
          console.log(`🔬 Navegando a research para sincronizar tecnologías (cada ${this.TECH_SYNC_INTERVAL} syncs)...`);
          const techsFromNav = await this.fetchTechnologiesWithNavigation();
          if (techsFromNav && Object.keys(techsFromNav).length > 0) {
            this.gameData.technologies = techsFromNav;
            console.log(`🔬 ${Object.keys(techsFromNav).length} tecnologías sincronizadas via navegación`);
          }
        }
      }
      
      this.syncCount++;

      // Guardar cola de producción
      if (productionQueue) {
        this.gameData.productionQueue = {
          buildings: {
            inProduction: productionQueue.buildings.inProduction,
            remainingSeconds: productionQueue.buildings.remainingSeconds,
            endTime: productionQueue.buildings.endTime,
            name: productionQueue.buildings.buildingName,
          },
          research: {
            inProduction: productionQueue.research.inProduction,
            remainingSeconds: productionQueue.research.remainingSeconds,
            endTime: productionQueue.research.endTime,
          },
          shipyard: {
            inProduction: productionQueue.shipyard.inProduction,
            remainingSeconds: productionQueue.shipyard.remainingSeconds,
            endTime: productionQueue.shipyard.endTime,
          },
        };
        
        if (productionQueue.buildings.inProduction) {
          console.log(`🏗️ Construcción en curso: ${productionQueue.buildings.buildingName || 'Edificio'} (${productionQueue.buildings.remainingSeconds}s restantes)`);
        }
        if (productionQueue.research.inProduction) {
          console.log(`🔬 Investigación en curso (${productionQueue.research.remainingSeconds}s restantes)`);
        }
      }

      this.gameData.lastUpdate = new Date();
      this.gameData.isUpdating = false;

      console.log(`✅ Sincronización completada: ${this.gameData.lastUpdate.toLocaleTimeString()}`);
      
      return this.gameData;
    } catch (error) {
      console.error('❌ Error sincronizando datos:', error);
      this.gameData.isUpdating = false;
      return this.gameData;
    }
  }

  getGameData(): GameData {
    return { ...this.gameData };
  }

  getCurrentPlanetData(): PlanetGameData | null {
    if (!this.gameData.currentPlanetId) return null;
    return this.gameData.planets.find(p => p.id === this.gameData.currentPlanetId) || null;
  }

  getPlanets(): PlanetGameData[] {
    return [...this.gameData.planets];
  }

  getMineLevelsFromCache(): MineLevels | null {
    const planet = this.getCurrentPlanetData();
    return planet?.mineLevels || null;
  }

  getStorageLevelsFromCache(): StorageLevels | null {
    const planet = this.getCurrentPlanetData();
    return planet?.storageLevels || null;
  }

  getResourcesFromCache(): { metal: number; crystal: number; deuterium: number; energy: number } | null {
    const planet = this.getCurrentPlanetData();
    return planet?.resources || null;
  }

  getTechnologiesFromCache(): Partial<TechnologyLevels> {
    return { ...this.gameData.technologies };
  }

  getProductionQueueFromCache(): ProductionQueue | null {
    return this.gameData.productionQueue;
  }

  /**
   * Verifica si hay construcción de edificios en curso usando datos cacheados
   * Recalcula el tiempo restante basándose en endTime
   */
  getBuildingProductionStatus(): { inProduction: boolean; remainingSeconds: number; buildingName?: string } {
    const queue = this.gameData.productionQueue?.buildings;
    if (!queue || !queue.inProduction || !queue.endTime) {
      return { inProduction: false, remainingSeconds: 0 };
    }

    const now = Math.floor(Date.now() / 1000);
    const remaining = Math.max(0, queue.endTime - now);
    
    return {
      inProduction: remaining > 0,
      remainingSeconds: remaining,
      buildingName: queue.name,
    };
  }

  isDataFresh(maxAgeSeconds: number = 120): boolean {
    const age = (Date.now() - this.gameData.lastUpdate.getTime()) / 1000;
    return age < maxAgeSeconds;
  }

  /**
   * Navega a la página de research y obtiene las tecnologías
   * Se usa ocasionalmente cuando no podemos obtenerlas del DOM actual
   */
  private async fetchTechnologiesWithNavigation(): Promise<Partial<TechnologyLevels> | null> {
    if (!ogameClient.page) return null;

    try {
      // Navegar a research
      await ogameClient.navigateTo('research');
      await ogameClient.page.waitForTimeout(2000);

      // Leer tecnologías del DOM
      const techs = await ogameClient.page.evaluate(() => {
        const result: Record<string, number> = {};
        const techMap: Record<string, string> = {
          '113': 'energyTechnology',
          '120': 'laserTechnology',
          '121': 'ionTechnology',
          '114': 'hyperspaceTechnology',
          '122': 'plasmaTechnology',
          '115': 'combustionDrive',
          '117': 'impulseDrive',
          '118': 'hyperspaceDrive',
          '106': 'espionageTechnology',
          '108': 'computerTechnology',
          '124': 'astrophysics',
          '123': 'intergalacticResearchNetwork',
          '199': 'gravitonTechnology',
          '109': 'weaponsTechnology',
          '110': 'shieldingTechnology',
          '111': 'armourTechnology'
        };

        document.querySelectorAll('li[data-technology], [data-technology]').forEach(el => {
          const techId = el.getAttribute('data-technology');
          if (techId && techMap[techId]) {
            const levelEl = el.querySelector('.level, .amount');
            if (levelEl && levelEl.textContent) {
              const level = parseInt(levelEl.textContent.replace(/\D/g, '')) || 0;
              if (level > 0) {
                result[techMap[techId]] = level;
              }
            }
          }
        });

        return result;
      });

      // Volver a supplies para no interferir con otras operaciones
      await ogameClient.navigateTo('resources');
      await ogameClient.page.waitForTimeout(1000);

      return techs;
    } catch (error) {
      console.error('❌ Error obteniendo tecnologías con navegación:', error);
      return null;
    }
  }

  getStatus(): {
    enabled: boolean;
    isUpdating: boolean;
    lastUpdate: Date;
    intervalSeconds: number;
    dataAge: number;
  } {
    return {
      enabled: this.config.enabled,
      isUpdating: this.gameData.isUpdating,
      lastUpdate: this.gameData.lastUpdate,
      intervalSeconds: this.config.intervalSeconds,
      dataAge: Math.floor((Date.now() - this.gameData.lastUpdate.getTime()) / 1000),
    };
  }

}

export const gameDataService = new GameDataService();
