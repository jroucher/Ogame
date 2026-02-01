/**
 * Expansion Policy - Lógica principal de la política expansionista
 * Coordina el escaneo de galaxias, la investigación de astrofísica y la colonización
 */

import { ogameClient } from '../browser/ogame-client.js';
import { galaxyScanner } from './galaxy-scanner.js';
import { colonizationManager } from './colonization-manager.js';
import {
  ExpansionConfig,
  ExpansionStatus,
  ExpansionAction,
  ColonizationTarget,
  AstrophysicsInfo,
  MIN_ACCEPTABLE_FIELDS,
  DEFAULT_MIN_FIELDS,
} from './expansion-types.js';

const DEFAULT_CONFIG: ExpansionConfig = {
  enabled: false,
  maxColonies: 9,
  preferredPositions: [8, 7, 9, 6, 10, 15],
  minPlanetFields: 180,
  scanRadius: 50,
  autoRecolonize: true,
  prioritizeAstrophysics: true,
};

export class ExpansionPolicy {
  private config: ExpansionConfig;
  private lastScanTime?: Date;
  private cachedTargets: ColonizationTarget[] = [];
  private pendingColonization?: {
    target: ColonizationTarget;
    arrivalTime: Date;
  };

  constructor(config: Partial<ExpansionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  getConfig(): ExpansionConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<ExpansionConfig>): void {
    this.config = { ...this.config, ...updates };
    console.log('⚙️ Configuración de expansión actualizada:', this.config);
  }

  async getStatus(): Promise<ExpansionStatus | null> {
    if (!ogameClient.getLoginStatus()) {
      return null;
    }

    try {
      const astrophysics = await colonizationManager.getAstrophysicsInfo();
      const colonyShips = await colonizationManager.getColonyShipStatus();
      const currentPlanets = await colonizationManager.getCurrentPlanets();

      if (!astrophysics || !colonyShips) {
        return null;
      }

      const nextAction = await this.determineNextAction(astrophysics, colonyShips);

      return {
        config: this.config,
        astrophysics,
        colonyShips,
        currentPlanets,
        pendingColonization: this.pendingColonization,
        lastScan: this.lastScanTime,
        nextAction,
      };
    } catch (error) {
      console.error('❌ Error obteniendo estado de expansión:', error);
      return null;
    }
  }

  async execute(): Promise<{ success: boolean; message: string; action?: ExpansionAction }> {
    if (!this.config.enabled) {
      return { success: false, message: 'Política expansionista deshabilitada' };
    }

    if (!ogameClient.getLoginStatus()) {
      return { success: false, message: 'No hay sesión activa en OGame' };
    }

    console.log('\n🌍 ========== POLÍTICA EXPANSIONISTA ==========');

    try {
      const astrophysics = await colonizationManager.getAstrophysicsInfo();
      if (!astrophysics) {
        return { success: false, message: 'No se pudo obtener información de Astrofísica' };
      }

      const colonyShips = await colonizationManager.getColonyShipStatus();
      if (!colonyShips) {
        return { success: false, message: 'No se pudo obtener estado de naves colonizadoras' };
      }

      const action = await this.determineNextAction(astrophysics, colonyShips);
      console.log(`\n🎯 Acción determinada: ${action.type}`);

      const result = await this.executeAction(action);

      return {
        success: result.success,
        message: result.message,
        action,
      };
    } catch (error) {
      console.error('❌ Error ejecutando política expansionista:', error);
      return { success: false, message: `Error: ${error}` };
    }
  }

  private async determineNextAction(
    astrophysics: AstrophysicsInfo,
    colonyShips: { available: number; inProduction: boolean; canBuild: boolean }
  ): Promise<ExpansionAction> {
    if (astrophysics.availableSlots <= 0) {
      if (this.config.prioritizeAstrophysics) {
        const resources = await ogameClient.getResources();
        const cost = colonizationManager.calculateAstrophysicsCost(astrophysics.level);

        if (resources && 
            resources.metal >= cost.metal && 
            resources.crystal >= cost.crystal && 
            resources.deuterium >= cost.deuterium) {
          return {
            type: 'RESEARCH_ASTROPHYSICS',
            reason: `No hay slots de colonia disponibles. Subir Astrofísica de nivel ${astrophysics.level} a ${astrophysics.level + 1}`,
          };
        }

        return {
          type: 'WAIT',
          reason: `No hay slots de colonia. Necesitas recursos para Astrofísica nivel ${astrophysics.level + 1}: ${cost.metal}M / ${cost.crystal}C / ${cost.deuterium}D`,
        };
      }

      return {
        type: 'WAIT',
        reason: `No hay slots de colonia disponibles (${astrophysics.currentColonies}/${astrophysics.maxColonies}). Sube Astrofísica para más colonias.`,
      };
    }

    if (colonyShips.available === 0) {
      if (colonyShips.inProduction) {
        return {
          type: 'WAIT',
          reason: 'Nave colonizadora en producción. Esperando...',
        };
      }

      if (colonyShips.canBuild) {
        return {
          type: 'BUILD_COLONY_SHIP',
          reason: 'No hay naves colonizadoras disponibles. Construyendo una.',
        };
      }

      return {
        type: 'WAIT',
        reason: 'No hay naves colonizadoras y no se puede construir (faltan recursos o requisitos).',
      };
    }

    if (this.pendingColonization) {
      const now = new Date();
      if (this.pendingColonization.arrivalTime > now) {
        return {
          type: 'WAIT',
          reason: `Colonización en curso hacia [${this.pendingColonization.target.coordinates.galaxy}:${this.pendingColonization.target.coordinates.system}:${this.pendingColonization.target.coordinates.position}]`,
          waitUntil: this.pendingColonization.arrivalTime,
        };
      }
      this.pendingColonization = undefined;
    }

    const needsScan = !this.lastScanTime || 
                      (Date.now() - this.lastScanTime.getTime()) > 30 * 60 * 1000 ||
                      this.cachedTargets.length === 0;

    if (needsScan) {
      const planets = await colonizationManager.getCurrentPlanets();
      const homeworld = planets.find(p => p.isHomeworld) || planets[0];

      if (homeworld) {
        return {
          type: 'SCAN_GALAXY',
          galaxy: homeworld.coordinates.galaxy,
          system: homeworld.coordinates.system,
        };
      }
    }

    const bestTarget = this.selectBestTarget(astrophysics);

    if (bestTarget) {
      return {
        type: 'COLONIZE',
        target: bestTarget,
      };
    }

    return {
      type: 'WAIT',
      reason: 'No se encontraron posiciones adecuadas para colonizar. Intenta ampliar el radio de búsqueda.',
    };
  }

  private async executeAction(action: ExpansionAction): Promise<{ success: boolean; message: string }> {
    switch (action.type) {
      case 'WAIT':
        console.log(`⏳ ${action.reason}`);
        return { success: true, message: action.reason };

      case 'RESEARCH_ASTROPHYSICS':
        console.log(`🔬 ${action.reason}`);
        const researchSuccess = await colonizationManager.researchAstrophysics();
        return {
          success: researchSuccess,
          message: researchSuccess ? 'Investigación de Astrofísica iniciada' : 'No se pudo iniciar la investigación',
        };

      case 'BUILD_COLONY_SHIP':
        console.log(`🚀 ${action.reason}`);
        const buildSuccess = await colonizationManager.buildColonyShip();
        return {
          success: buildSuccess,
          message: buildSuccess ? 'Nave colonizadora en construcción' : 'No se pudo construir la nave colonizadora',
        };

      case 'SCAN_GALAXY':
        console.log(`🔭 Escaneando galaxia ${action.galaxy}, sistema ${action.system}...`);
        const planets = await colonizationManager.getCurrentPlanets();
        const homeworld = planets.find(p => p.isHomeworld) || planets[0];

        if (!homeworld) {
          return { success: false, message: 'No se encontró planeta principal' };
        }

        const astrophysics = await colonizationManager.getAstrophysicsInfo();
        const targets = await galaxyScanner.scanNearbySystemsForColonization(
          homeworld.coordinates,
          this.config.scanRadius,
          this.config.preferredPositions,
          astrophysics?.level || 1
        );

        this.cachedTargets = targets;
        this.lastScanTime = new Date();

        return {
          success: true,
          message: `Escaneo completado. ${targets.length} posiciones encontradas.`,
        };

      case 'COLONIZE':
        const target = action.target;
        console.log(`🌍 Colonizando [${target.coordinates.galaxy}:${target.coordinates.system}:${target.coordinates.position}]...`);

        const colonizeSuccess = await colonizationManager.sendColonizationMission(target);

        if (colonizeSuccess) {
          this.pendingColonization = {
            target,
            arrivalTime: new Date(Date.now() + target.travelTimeSeconds * 1000),
          };

          this.cachedTargets = this.cachedTargets.filter(
            t => !(t.coordinates.galaxy === target.coordinates.galaxy &&
                   t.coordinates.system === target.coordinates.system &&
                   t.coordinates.position === target.coordinates.position)
          );
        }

        return {
          success: colonizeSuccess,
          message: colonizeSuccess
            ? `Misión de colonización enviada a [${target.coordinates.galaxy}:${target.coordinates.system}:${target.coordinates.position}]`
            : 'No se pudo enviar la misión de colonización',
        };

      case 'ABANDON_PLANET':
        console.log(`🗑️ Abandonar planeta: ${action.reason}`);
        return { success: false, message: 'Abandono de planeta no implementado aún' };

      default:
        return { success: false, message: 'Acción desconocida' };
    }
  }

  private selectBestTarget(astrophysics: AstrophysicsInfo): ColonizationTarget | null {
    if (this.cachedTargets.length === 0) {
      return null;
    }

    const validTargets = this.cachedTargets.filter(target => {
      const pos = target.coordinates.position;

      if (pos < astrophysics.colonizablePositions.min || 
          pos > astrophysics.colonizablePositions.max) {
        return false;
      }

      const minFields = MIN_ACCEPTABLE_FIELDS[pos] || DEFAULT_MIN_FIELDS;
      const avgFields = (target.estimatedFields.min + target.estimatedFields.max) / 2;

      if (avgFields < minFields) {
        return false;
      }

      return true;
    });

    if (validTargets.length === 0) {
      return null;
    }

    return validTargets[0];
  }

  async scanAndGetTargets(): Promise<ColonizationTarget[]> {
    const planets = await colonizationManager.getCurrentPlanets();
    const homeworld = planets.find(p => p.isHomeworld) || planets[0];

    if (!homeworld) {
      return [];
    }

    const astrophysics = await colonizationManager.getAstrophysicsInfo();

    const targets = await galaxyScanner.scanNearbySystemsForColonization(
      homeworld.coordinates,
      this.config.scanRadius,
      this.config.preferredPositions,
      astrophysics?.level || 1
    );

    this.cachedTargets = targets;
    this.lastScanTime = new Date();

    return targets;
  }

  getCachedTargets(): ColonizationTarget[] {
    return [...this.cachedTargets];
  }

  clearCache(): void {
    this.cachedTargets = [];
    this.lastScanTime = undefined;
    galaxyScanner.clearCache();
  }
}

export const expansionPolicy = new ExpansionPolicy();
