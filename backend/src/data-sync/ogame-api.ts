/**
 * Cliente API para OGame
 * Usa las APIs internas de OGame en lugar de web scraping
 * 
 * Endpoints conocidos de OGame:
 * - /api/serverData.xml - Datos del servidor
 * - /api/players.xml - Lista de jugadores
 * - /api/universe.xml - Datos del universo
 * - /api/playerData.xml?id=X - Datos de un jugador
 * 
 * APIs internas del juego (requieren sesión):
 * - fetchTechs - Tecnologías
 * - fetchResources - Recursos
 * - minifleet - Datos de flota
 */

import { ogameClient } from '../browser/ogame-client.js';
import { MineLevels, StorageLevels } from '../game/ogame-formulas.js';
import { TechnologyLevels, PlanetGameData } from './game-data.types.js';

interface OGameApiResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export class OGameApi {
  
  /**
   * Ejecuta JavaScript en el contexto de la página del juego
   * para acceder a las variables globales de OGame
   */
  private async executeInGame<T>(script: string): Promise<T | null> {
    if (!ogameClient.page) {
      console.error('❌ No hay página activa');
      return null;
    }

    try {
      const result = await ogameClient.page.evaluate(script);
      return result as T;
    } catch (error) {
      console.error('❌ Error ejecutando script en juego:', error);
      return null;
    }
  }

  /**
   * Obtiene los recursos actuales del planeta usando la API interna
   */
  async getResources(): Promise<{ metal: number; crystal: number; deuterium: number; energy: number } | null> {
    const resources = await this.executeInGame<any>(`
      (() => {
        if (typeof resourcesBar !== 'undefined') {
          return {
            metal: resourcesBar.resources.metal.amount || 0,
            crystal: resourcesBar.resources.crystal.amount || 0,
            deuterium: resourcesBar.resources.deuterium.amount || 0,
            energy: resourcesBar.resources.energy.amount || 0
          };
        }
        // Fallback: leer del DOM
        const getMetal = document.querySelector('#resources_metal')?.getAttribute('data-raw');
        const getCrystal = document.querySelector('#resources_crystal')?.getAttribute('data-raw');
        const getDeuterium = document.querySelector('#resources_deuterium')?.getAttribute('data-raw');
        const getEnergy = document.querySelector('#resources_energy')?.getAttribute('data-raw');
        return {
          metal: parseInt(getMetal || '0'),
          crystal: parseInt(getCrystal || '0'),
          deuterium: parseInt(getDeuterium || '0'),
          energy: parseInt(getEnergy || '0')
        };
      })()
    `);

    if (resources) {
      console.log('📊 Recursos obtenidos via API interna');
    }
    return resources;
  }

  /**
   * Obtiene la lista de planetas del jugador
   */
  async getPlanets(): Promise<Array<{ id: string; name: string; coordinates: string }> | null> {
    const planets = await this.executeInGame<any[]>(`
      (() => {
        const planetList = [];
        const planetElements = document.querySelectorAll('#planetList .smallplanet');
        
        planetElements.forEach(planet => {
          const id = planet.id || '';
          const nameEl = planet.querySelector('.planet-name');
          const coordsEl = planet.querySelector('.planet-koords');
          
          planetList.push({
            id: id,
            name: nameEl ? nameEl.textContent.trim() : 'Planeta',
            coordinates: coordsEl ? coordsEl.textContent.trim() : '[?:?:?]'
          });
        });
        
        return planetList;
      })()
    `);

    if (planets && planets.length > 0) {
      console.log(`🌍 ${planets.length} planeta(s) encontrado(s) via API`);
    }
    return planets;
  }

  /**
   * Obtiene el planeta actualmente seleccionado
   */
  async getCurrentPlanet(): Promise<{ id: string; name: string; coordinates: string } | null> {
    return await this.executeInGame<{ id: string; name: string; coordinates: string }>(`
      (() => {
        const selected = document.querySelector('#planetList .smallplanet.hightlightPlanet, #planetList .smallplanet.active');
        if (!selected) return null;
        
        const id = selected.id || 'planet-unknown';
        const nameEl = selected.querySelector('.planet-name');
        const coordsEl = selected.querySelector('.planet-koords');
        
        return {
          id: id,
          name: nameEl ? nameEl.textContent.trim() : 'Planeta',
          coordinates: coordsEl ? coordsEl.textContent.trim() : '[?:?:?]'
        };
      })()
    `);
  }

  /**
   * Obtiene los niveles de edificios/minas usando la API AJAX interna de OGame
   * No requiere navegación - funciona desde cualquier página
   */
  async getBuildingLevels(): Promise<MineLevels | null> {
    if (!ogameClient.page) {
      console.error('❌ No hay página activa');
      return null;
    }

    try {
      // Primero intentar leer del DOM actual (si estamos en supplies)
      let levels = await ogameClient.page.evaluate(() => {
        const result: Record<string, number> = {
          metal: 0,
          crystal: 0,
          deuterium: 0,
          solar: 0,
          solarSatellites: 0
        };
        
        const techIds: Record<string, string> = {
          metal: '1',
          crystal: '2',
          deuterium: '3',
          solar: '4'
        };
        
        let found = false;
        for (const [key, id] of Object.entries(techIds)) {
          const el = document.querySelector(`li[data-technology="${id}"]`);
          if (el) {
            found = true;
            const levelEl = el.querySelector('.level, .amount');
            if (levelEl && levelEl.textContent) {
              result[key] = parseInt(levelEl.textContent.replace(/\D/g, '')) || 0;
            }
          }
        }
        
        // Satélites solares (ID 212)
        const satEl = document.querySelector('li[data-technology="212"]');
        if (satEl) {
          const levelEl = satEl.querySelector('.level, .amount');
          if (levelEl && levelEl.textContent) {
            result.solarSatellites = parseInt(levelEl.textContent.replace(/\D/g, '')) || 0;
          }
        }
        
        return found ? result : null;
      });

      // Si no encontramos datos en el DOM, hacer petición AJAX
      if (!levels) {
        console.log('📡 Edificios no en DOM, usando AJAX...');
        levels = await ogameClient.page.evaluate(async () => {
          const currentPlanetObj = (globalThis as any).currentPlanet;
          const planetId = currentPlanetObj?.id;
          if (!planetId) return null;
          
          const response = await fetch(`/game/index.php?page=ingame&component=supplies&cp=${planetId}&ajax=1`, {
            credentials: 'include',
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
          });
          
          const html = await response.text();
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');
          
          const result: Record<string, number> = {
            metal: 0, crystal: 0, deuterium: 0, solar: 0, solarSatellites: 0
          };
          
          const techIds: Record<string, string> = { metal: '1', crystal: '2', deuterium: '3', solar: '4' };
          
          for (const [key, id] of Object.entries(techIds)) {
            const el = doc.querySelector(`li[data-technology="${id}"]`);
            if (el) {
              const levelEl = el.querySelector('.level, .amount');
              if (levelEl && levelEl.textContent) {
                result[key] = parseInt(levelEl.textContent.replace(/\D/g, '')) || 0;
              }
            }
          }
          
          const satEl = doc.querySelector('li[data-technology="212"]');
          if (satEl) {
            const levelEl = satEl.querySelector('.level, .amount');
            if (levelEl && levelEl.textContent) {
              result.solarSatellites = parseInt(levelEl.textContent.replace(/\D/g, '')) || 0;
            }
          }
          
          return result;
        });
      }

      if (levels) {
        console.log('🏭 Niveles de edificios obtenidos');
        return {
          metal: levels.metal || 0,
          crystal: levels.crystal || 0,
          deuterium: levels.deuterium || 0,
          solar: levels.solar || 0,
          solarSatellites: levels.solarSatellites || 0,
        };
      }
    } catch (error) {
      console.error('❌ Error en getBuildingLevels:', error);
    }
    return null;
  }

  /**
   * Obtiene los niveles de almacenes
   * Intenta leer del DOM primero, si no usa AJAX
   */
  async getStorageLevels(): Promise<StorageLevels | null> {
    if (!ogameClient.page) {
      console.error('❌ No hay página activa');
      return null;
    }

    try {
      // Primero intentar leer del DOM actual
      let levels = await ogameClient.page.evaluate(() => {
        const result: Record<string, number> = { metal: 0, crystal: 0, deuterium: 0 };
        const storageIds: Record<string, string> = { metal: '22', crystal: '23', deuterium: '24' };
        
        let found = false;
        for (const [key, id] of Object.entries(storageIds)) {
          const el = document.querySelector(`li[data-technology="${id}"]`);
          if (el) {
            found = true;
            let level = 0;
            
            // Primero buscar data-value en el elemento .level (más confiable)
            const levelEl = el.querySelector('.level');
            if (levelEl) {
              const dataValue = levelEl.getAttribute('data-value');
              if (dataValue) {
                level = parseInt(dataValue) || 0;
              } else if (levelEl.textContent) {
                level = parseInt(levelEl.textContent.replace(/\D/g, '')) || 0;
              }
            }
            
            // Fallback: buscar .stockAmount
            if (level === 0) {
              const stockEl = el.querySelector('.stockAmount');
              if (stockEl && stockEl.textContent) {
                level = parseInt(stockEl.textContent.replace(/\D/g, '')) || 0;
              }
            }
            
            // Fallback: buscar cualquier span con número dentro del elemento
            if (level === 0) {
              const spans = Array.from(el.querySelectorAll('span'));
              for (const span of spans) {
                const text = span.textContent?.trim();
                if (text && /^\d+$/.test(text)) {
                  level = parseInt(text);
                  break;
                }
              }
            }
            
            // Último fallback: buscar data-value en el elemento
            if (level === 0) {
              const dataValue = el.getAttribute('data-value') || el.getAttribute('data-level');
              if (dataValue) {
                level = parseInt(dataValue) || 0;
              }
            }
            
            result[key] = level;
            console.log(`Storage ${key} (ID ${id}): level=${level}`);
          }
        }
        
        return found ? result : null;
      });

      // Si no encontramos datos en el DOM, hacer petición AJAX
      if (!levels) {
        console.log('📡 Almacenes no en DOM, usando AJAX...');
        levels = await ogameClient.page.evaluate(async () => {
          const currentPlanetObj = (globalThis as any).currentPlanet;
          const planetId = currentPlanetObj?.id;
          if (!planetId) return null;
          
          const response = await fetch(`/game/index.php?page=ingame&component=supplies&cp=${planetId}&ajax=1`, {
            credentials: 'include',
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
          });
          
          const html = await response.text();
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');
          
          const result: Record<string, number> = { metal: 0, crystal: 0, deuterium: 0 };
          const storageIds: Record<string, string> = { metal: '22', crystal: '23', deuterium: '24' };
          
          for (const [key, id] of Object.entries(storageIds)) {
            const el = doc.querySelector(`li[data-technology="${id}"]`);
            if (el) {
              const levelEl = el.querySelector('.level, .amount, .targetlevel span, span.level');
              if (levelEl && levelEl.textContent) {
                result[key] = parseInt(levelEl.textContent.replace(/\D/g, '')) || 0;
              }
            }
          }
          
          return result;
        });
      }

      if (levels) {
        console.log(`📦 Niveles de almacenes: Metal=${levels.metal}, Cristal=${levels.crystal}, Deuterio=${levels.deuterium}`);
        return {
          metal: levels.metal || 0,
          crystal: levels.crystal || 0,
          deuterium: levels.deuterium || 0,
        };
      }
    } catch (error) {
      console.error('❌ Error en getStorageLevels:', error);
    }
    return null;
  }

  /**
   * Obtiene los niveles de tecnologías
   * Lee del DOM actual si estamos en la página de research
   * Las tecnologías no cambian frecuentemente, así que está bien si no se obtienen siempre
   */
  async getTechnologyLevels(): Promise<Partial<TechnologyLevels> | null> {
    if (!ogameClient.page) {
      console.error('❌ No hay página activa');
      return null;
    }

    try {
      const techs = await ogameClient.page.evaluate(() => {
        // Verificar si estamos en la página de research
        const isResearchPage = window.location.href.includes('component=research') || 
                               document.querySelector('#research') !== null ||
                               document.querySelector('.research') !== null;
        
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
        
        // Buscar tecnologías en el DOM actual
        const techElements = document.querySelectorAll('li[data-technology], .technology[data-technology], [data-technology]');
        
        techElements.forEach(el => {
          const techId = el.getAttribute('data-technology');
          if (techId && techMap[techId]) {
            const levelEl = el.querySelector('.level, .amount, .levelValue, span.level');
            let level = 0;
            
            if (levelEl && levelEl.textContent) {
              level = parseInt(levelEl.textContent.replace(/\D/g, '')) || 0;
            } else {
              const dataLevel = el.getAttribute('data-level') || el.getAttribute('data-value');
              if (dataLevel) {
                level = parseInt(dataLevel) || 0;
              }
            }
            
            if (level > 0) {
              result[techMap[techId]] = level;
            }
          }
        });
        
        // Solo devolver si encontramos tecnologías de research (no edificios)
        const researchTechIds = ['113', '120', '121', '114', '122', '115', '117', '118', '106', '108', '124', '123', '199', '109', '110', '111'];
        const foundResearchTechs = Object.keys(result).length > 0;
        
        return foundResearchTechs ? result : null;
      });

      if (techs && Object.keys(techs).length > 0) {
        console.log(`🔬 ${Object.keys(techs).length} tecnologías obtenidas del DOM`);
        return techs;
      } else {
        console.log('ℹ️ Tecnologías no disponibles (no estamos en página de research)');
      }
    } catch (error) {
      console.error('❌ Error en getTechnologyLevels:', error);
    }
    return null;
  }

  /**
   * Obtiene información detallada sobre construcciones en curso
   */
  async getProductionQueue(): Promise<{
    buildings: { inProduction: boolean; remainingSeconds: number; endTime: number | null; buildingName?: string; buildingId?: number };
    research: { inProduction: boolean; remainingSeconds: number; endTime: number | null; researchName?: string; researchId?: number };
    shipyard: { inProduction: boolean; remainingSeconds: number; endTime: number | null };
  } | null> {
    const queue = await this.executeInGame<any>(`
      (() => {
        const result = {
          buildings: { inProduction: false, remainingSeconds: 0, endTime: null },
          research: { inProduction: false, remainingSeconds: 0, endTime: null },
          shipyard: { inProduction: false, remainingSeconds: 0, endTime: null }
        };
        
        const now = Math.floor(Date.now() / 1000);
        
        // Construcción de edificios - buscar en múltiples lugares
        // 1. Variable global de OGame
        if (typeof constructionEndTime !== 'undefined' && constructionEndTime > now) {
          result.buildings.inProduction = true;
          result.buildings.remainingSeconds = constructionEndTime - now;
          result.buildings.endTime = constructionEndTime;
        }
        
        // 2. Elemento del DOM con data-end
        const buildingTimer = document.querySelector('.construction .timer[data-end], #buildingCountdown[data-end], .buildingCountdown[data-end]');
        if (buildingTimer) {
          const endTime = parseInt(buildingTimer.getAttribute('data-end') || '0');
          if (endTime > now) {
            result.buildings.inProduction = true;
            result.buildings.remainingSeconds = endTime - now;
            result.buildings.endTime = endTime;
            
            // Obtener nombre del edificio
            const nameEl = document.querySelector('.construction .name, .buildingName, .construction_icon + .content .name');
            if (nameEl) {
              result.buildings.buildingName = nameEl.textContent.trim();
            }
          }
        }
        
        // 3. Buscar en el header de construcción
        const headerConstruction = document.querySelector('#header_construction .timer, #constructionIcon .timer');
        if (headerConstruction && !result.buildings.inProduction) {
          const dataEnd = headerConstruction.getAttribute('data-end');
          if (dataEnd) {
            const endTime = parseInt(dataEnd);
            if (endTime > now) {
              result.buildings.inProduction = true;
              result.buildings.remainingSeconds = endTime - now;
              result.buildings.endTime = endTime;
            }
          }
        }
        
        // Investigación en curso
        if (typeof researchEndTime !== 'undefined' && researchEndTime > now) {
          result.research.inProduction = true;
          result.research.remainingSeconds = researchEndTime - now;
          result.research.endTime = researchEndTime;
        }
        
        const researchTimer = document.querySelector('#researchCountdown[data-end], .research .timer[data-end]');
        if (researchTimer) {
          const endTime = parseInt(researchTimer.getAttribute('data-end') || '0');
          if (endTime > now) {
            result.research.inProduction = true;
            result.research.remainingSeconds = endTime - now;
            result.research.endTime = endTime;
          }
        }
        
        // Astillero en curso
        if (typeof shipyardEndTime !== 'undefined' && shipyardEndTime > now) {
          result.shipyard.inProduction = true;
          result.shipyard.remainingSeconds = shipyardEndTime - now;
          result.shipyard.endTime = shipyardEndTime;
        }
        
        const shipyardTimer = document.querySelector('#shipyardCountdown[data-end], .shipyard .timer[data-end]');
        if (shipyardTimer) {
          const endTime = parseInt(shipyardTimer.getAttribute('data-end') || '0');
          if (endTime > now) {
            result.shipyard.inProduction = true;
            result.shipyard.remainingSeconds = endTime - now;
            result.shipyard.endTime = endTime;
          }
        }
        
        return result;
      })()
    `);

    return queue;
  }

  /**
   * Obtiene datos básicos sin necesidad de navegar (recursos, planetas, cola de producción)
   * Estos datos están disponibles en cualquier página del juego
   */
  async getBasicData(): Promise<{
    resources: { metal: number; crystal: number; deuterium: number; energy: number } | null;
    planets: Array<{ id: string; name: string; coordinates: string }> | null;
    currentPlanet: { id: string; name: string; coordinates: string } | null;
    productionQueue: {
      buildings: { inProduction: boolean; remainingSeconds: number; endTime: number | null; buildingName?: string };
      research: { inProduction: boolean; remainingSeconds: number; endTime: number | null };
      shipyard: { inProduction: boolean; remainingSeconds: number; endTime: number | null };
    } | null;
  }> {
    const [resources, planets, currentPlanet, productionQueue] = await Promise.all([
      this.getResources(),
      this.getPlanets(),
      this.getCurrentPlanet(),
      this.getProductionQueue(),
    ]);

    return { resources, planets, currentPlanet, productionQueue };
  }

  /**
   * Hace una petición HTTP usando el contexto del navegador (con cookies de sesión)
   */
  async fetchWithSession(url: string): Promise<any> {
    if (!ogameClient.page) {
      console.error('❌ No hay página activa');
      return null;
    }

    try {
      const response = await ogameClient.page.evaluate(async (fetchUrl) => {
        const res = await fetch(fetchUrl, {
          credentials: 'include',
          headers: {
            'Accept': 'application/json, text/plain, */*',
            'X-Requested-With': 'XMLHttpRequest'
          }
        });
        
        const contentType = res.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          return await res.json();
        }
        return await res.text();
      }, url);

      return response;
    } catch (error) {
      console.error('❌ Error en petición HTTP:', error);
      return null;
    }
  }

  /**
   * Obtiene todos los datos del juego de una vez
   */
  async getAllGameData(): Promise<{
    resources: { metal: number; crystal: number; deuterium: number; energy: number } | null;
    planets: Array<{ id: string; name: string; coordinates: string }> | null;
    currentPlanet: { id: string; name: string; coordinates: string } | null;
    buildings: MineLevels | null;
    storages: StorageLevels | null;
    technologies: Partial<TechnologyLevels> | null;
    productionQueue: {
      buildings: { inProduction: boolean; remainingSeconds: number; endTime: number | null; buildingName?: string };
      research: { inProduction: boolean; remainingSeconds: number; endTime: number | null };
      shipyard: { inProduction: boolean; remainingSeconds: number; endTime: number | null };
    } | null;
  }> {
    console.log('\n🔄 ========== OBTENIENDO DATOS VIA AJAX (SIN NAVEGACIÓN) ==========');

    // Obtener todos los datos en paralelo usando AJAX - NO requiere navegación
    const [resources, planets, currentPlanet, buildings, storages, technologies, productionQueue] = await Promise.all([
      this.getResources(),
      this.getPlanets(),
      this.getCurrentPlanet(),
      this.getBuildingLevels(),
      this.getStorageLevels(),
      this.getTechnologyLevels(),
      this.getProductionQueue(),
    ]);

    console.log('✅ Datos obtenidos via AJAX (sin navegación)');

    return {
      resources,
      planets,
      currentPlanet,
      buildings,
      storages,
      technologies,
      productionQueue,
    };
  }
}

export const ogameApi = new OGameApi();
