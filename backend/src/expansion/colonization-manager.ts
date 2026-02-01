/**
 * Colonization Manager - Gestiona el proceso de colonización de planetas
 */

import { ogameClient } from '../browser/ogame-client.js';
import {
  Coordinates,
  ColonizationTarget,
  ColonyShipStatus,
  AstrophysicsInfo,
  PlanetInfo,
  COLONY_SHIP_COST,
  ASTROPHYSICS_BASE_COST,
} from './expansion-types.js';

export class ColonizationManager {
  async getAstrophysicsInfo(): Promise<AstrophysicsInfo | null> {
    if (!ogameClient.page || !ogameClient.getLoginStatus()) {
      return null;
    }

    try {
      console.log('🔬 Obteniendo información de Astrofísica...');

      await ogameClient.navigateTo('research');
      await ogameClient.page.waitForTimeout(2000);

      const astrophysicsSelector = 'li.astrophysics, li[data-technology="124"], [data-technology="astrophysics"]';
      const astrophysicsElement = ogameClient.page.locator(astrophysicsSelector).first();

      let level = 0;

      if (await astrophysicsElement.isVisible({ timeout: 2000 }).catch(() => false)) {
        const levelElement = astrophysicsElement.locator('.level, [data-value]').first();

        if (await levelElement.isVisible({ timeout: 1000 }).catch(() => false)) {
          const levelText = await levelElement.textContent() || '0';
          level = parseInt(levelText.replace(/\D/g, '')) || 0;
        }

        if (level === 0) {
          const dataValue = await astrophysicsElement.getAttribute('data-value');
          if (dataValue) {
            level = parseInt(dataValue) || 0;
          }
        }
      }

      const maxColonies = this.calculateMaxColonies(level);
      const maxExpeditions = this.calculateMaxExpeditions(level);
      const colonizablePositions = this.getColonizablePositions(level);

      const planets = await ogameClient.getPlanets();
      const currentColonies = planets.length;

      const info: AstrophysicsInfo = {
        level,
        maxColonies,
        currentColonies,
        availableSlots: maxColonies - currentColonies,
        maxExpeditions,
        colonizablePositions,
      };

      console.log(`   - Nivel: ${level}`);
      console.log(`   - Colonias máximas: ${maxColonies}`);
      console.log(`   - Colonias actuales: ${currentColonies}`);
      console.log(`   - Slots disponibles: ${info.availableSlots}`);
      console.log(`   - Posiciones colonizables: ${colonizablePositions.min}-${colonizablePositions.max}`);

      return info;
    } catch (error) {
      console.error('❌ Error obteniendo información de Astrofísica:', error);
      return null;
    }
  }

  private calculateMaxColonies(astrophysicsLevel: number): number {
    if (astrophysicsLevel === 0) return 1;
    return 1 + Math.floor((astrophysicsLevel + 1) / 2);
  }

  private calculateMaxExpeditions(astrophysicsLevel: number): number {
    if (astrophysicsLevel === 0) return 0;
    return Math.floor(Math.sqrt(astrophysicsLevel));
  }

  private getColonizablePositions(astrophysicsLevel: number): { min: number; max: number } {
    if (astrophysicsLevel >= 8) return { min: 1, max: 15 };
    if (astrophysicsLevel >= 6) return { min: 2, max: 14 };
    if (astrophysicsLevel >= 4) return { min: 3, max: 13 };
    return { min: 4, max: 12 };
  }

  async getColonyShipStatus(): Promise<ColonyShipStatus | null> {
    if (!ogameClient.page || !ogameClient.getLoginStatus()) {
      return null;
    }

    try {
      console.log('🚀 Verificando estado de naves colonizadoras...');

      await ogameClient.navigateTo('shipyard');
      await ogameClient.page.waitForTimeout(2000);

      const colonyShipSelector = 'li.colonizationShip, li[data-technology="208"], [data-technology="colonizationShip"]';
      const colonyShipElement = ogameClient.page.locator(colonyShipSelector).first();

      let available = 0;
      let inProduction = false;
      let canBuild = false;

      if (await colonyShipElement.isVisible({ timeout: 2000 }).catch(() => false)) {
        const countElement = colonyShipElement.locator('.amount, .level, [data-value]').first();

        if (await countElement.isVisible({ timeout: 1000 }).catch(() => false)) {
          const countText = await countElement.textContent() || '0';
          available = parseInt(countText.replace(/\D/g, '')) || 0;
        }

        const elementClass = await colonyShipElement.getAttribute('class') || '';
        canBuild = !elementClass.includes('off') && !elementClass.includes('disabled');

        const productionElement = ogameClient.page.locator('.shipyardCountdown, #shipyardCountdown, .countdown').first();
        inProduction = await productionElement.isVisible({ timeout: 500 }).catch(() => false);
      }

      const resources = await ogameClient.getResources();
      if (resources) {
        const hasResources = resources.metal >= COLONY_SHIP_COST.metal &&
                            resources.crystal >= COLONY_SHIP_COST.crystal &&
                            resources.deuterium >= COLONY_SHIP_COST.deuterium;
        canBuild = canBuild && hasResources;
      }

      const status: ColonyShipStatus = {
        available,
        inProduction,
        canBuild,
        cost: COLONY_SHIP_COST,
      };

      console.log(`   - Disponibles: ${available}`);
      console.log(`   - En producción: ${inProduction}`);
      console.log(`   - Puede construir: ${canBuild}`);

      return status;
    } catch (error) {
      console.error('❌ Error verificando naves colonizadoras:', error);
      return null;
    }
  }

  async buildColonyShip(): Promise<boolean> {
    if (!ogameClient.page || !ogameClient.getLoginStatus()) {
      return false;
    }

    try {
      console.log('🏗️ Construyendo nave colonizadora...');

      await ogameClient.navigateTo('shipyard');
      await ogameClient.page.waitForTimeout(2000);

      const colonyShipSelector = 'li.colonizationShip, li[data-technology="208"]';
      const colonyShipElement = ogameClient.page.locator(colonyShipSelector).first();

      if (!await colonyShipElement.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('❌ No se encontró el elemento de nave colonizadora');
        return false;
      }

      await colonyShipElement.click();
      await ogameClient.page.waitForTimeout(2000);

      const buildButtonSelectors = [
        'button.upgrade',
        'a.upgrade',
        'button:has-text("Construir")',
        'a:has-text("Construir")',
        'button:has-text("Build")',
        '.build_amount button',
        '#build_amount button',
      ];

      for (const buttonSelector of buildButtonSelectors) {
        const button = ogameClient.page.locator(buttonSelector).first();

        if (await button.isVisible({ timeout: 1000 }).catch(() => false)) {
          const isDisabled = await button.getAttribute('disabled') !== null;
          const buttonClass = await button.getAttribute('class') || '';

          if (!isDisabled && !buttonClass.includes('disabled') && !buttonClass.includes('off')) {
            await button.click();
            console.log('✅ Nave colonizadora en construcción');
            await ogameClient.page.waitForTimeout(2000);
            return true;
          }
        }
      }

      console.log('❌ No se pudo iniciar la construcción de la nave colonizadora');
      return false;
    } catch (error) {
      console.error('❌ Error construyendo nave colonizadora:', error);
      return false;
    }
  }

  async sendColonizationMission(target: ColonizationTarget): Promise<boolean> {
    if (!ogameClient.page || !ogameClient.getLoginStatus()) {
      return false;
    }

    try {
      const coords = target.coordinates;
      console.log(`🚀 Enviando misión de colonización a [${coords.galaxy}:${coords.system}:${coords.position}]...`);

      await ogameClient.navigateTo('fleet');
      await ogameClient.page.waitForTimeout(2000);

      const colonyShipInput = ogameClient.page.locator('input[name="am208"], #ship_208, input[data-technology="208"]').first();

      if (await colonyShipInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await colonyShipInput.fill('1');
      } else {
        console.log('❌ No se encontró el input de nave colonizadora');
        return false;
      }

      const continueButton = ogameClient.page.locator('#continueToFleet2, .continue, button:has-text("Continuar")').first();
      if (await continueButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await continueButton.click();
        await ogameClient.page.waitForTimeout(2000);
      }

      const galaxyInput = ogameClient.page.locator('#galaxy, input[name="galaxy"]').first();
      const systemInput = ogameClient.page.locator('#system, input[name="system"]').first();
      const positionInput = ogameClient.page.locator('#position, input[name="position"]').first();

      if (await galaxyInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await galaxyInput.fill(coords.galaxy.toString());
      }
      if (await systemInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await systemInput.fill(coords.system.toString());
      }
      if (await positionInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await positionInput.fill(coords.position.toString());
      }

      const continueButton2 = ogameClient.page.locator('#continueToFleet3, .continue, button:has-text("Continuar")').first();
      if (await continueButton2.isVisible({ timeout: 2000 }).catch(() => false)) {
        await continueButton2.click();
        await ogameClient.page.waitForTimeout(2000);
      }

      const colonizeMissionSelector = '#missionButton7, input[value="7"], [data-mission="7"]';
      const colonizeMission = ogameClient.page.locator(colonizeMissionSelector).first();

      if (await colonizeMission.isVisible({ timeout: 2000 }).catch(() => false)) {
        await colonizeMission.click();
        await ogameClient.page.waitForTimeout(1000);
      } else {
        console.log('❌ No se encontró la opción de misión de colonización');
        return false;
      }

      const sendFleetButton = ogameClient.page.locator('#sendFleet, .send_fleet, button:has-text("Enviar")').first();

      if (await sendFleetButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await sendFleetButton.click();
        console.log(`✅ Misión de colonización enviada a [${coords.galaxy}:${coords.system}:${coords.position}]`);
        await ogameClient.page.waitForTimeout(2000);
        return true;
      }

      console.log('❌ No se pudo enviar la misión de colonización');
      return false;
    } catch (error) {
      console.error('❌ Error enviando misión de colonización:', error);
      return false;
    }
  }

  async researchAstrophysics(): Promise<boolean> {
    if (!ogameClient.page || !ogameClient.getLoginStatus()) {
      return false;
    }

    try {
      console.log('🔬 Iniciando investigación de Astrofísica...');

      await ogameClient.navigateTo('research');
      await ogameClient.page.waitForTimeout(2000);

      const astrophysicsSelector = 'li.astrophysics, li[data-technology="124"]';
      const astrophysicsElement = ogameClient.page.locator(astrophysicsSelector).first();

      if (!await astrophysicsElement.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('❌ No se encontró Astrofísica en la lista de investigaciones');
        return false;
      }

      await astrophysicsElement.click();
      await ogameClient.page.waitForTimeout(2000);

      const researchButtonSelectors = [
        'button.upgrade',
        'a.upgrade',
        'button:has-text("Investigar")',
        'a:has-text("Investigar")',
        'button:has-text("Research")',
      ];

      for (const buttonSelector of researchButtonSelectors) {
        const button = ogameClient.page.locator(buttonSelector).first();

        if (await button.isVisible({ timeout: 1000 }).catch(() => false)) {
          const isDisabled = await button.getAttribute('disabled') !== null;
          const buttonClass = await button.getAttribute('class') || '';

          if (!isDisabled && !buttonClass.includes('disabled') && !buttonClass.includes('off')) {
            await button.click();
            console.log('✅ Investigación de Astrofísica iniciada');
            await ogameClient.page.waitForTimeout(2000);
            return true;
          }
        }
      }

      console.log('❌ No se pudo iniciar la investigación de Astrofísica');
      return false;
    } catch (error) {
      console.error('❌ Error investigando Astrofísica:', error);
      return false;
    }
  }

  async getCurrentPlanets(): Promise<PlanetInfo[]> {
    if (!ogameClient.page || !ogameClient.getLoginStatus()) {
      return [];
    }

    try {
      const planets = await ogameClient.getPlanets();
      const planetInfos: PlanetInfo[] = [];

      for (let i = 0; i < planets.length; i++) {
        const planet = planets[i];
        const coordsMatch = planet.coordinates.match(/\[(\d+):(\d+):(\d+)\]/);

        const coords: Coordinates = coordsMatch ? {
          galaxy: parseInt(coordsMatch[1]),
          system: parseInt(coordsMatch[2]),
          position: parseInt(coordsMatch[3]),
        } : { galaxy: 1, system: 1, position: 1 };

        planetInfos.push({
          id: planet.id,
          name: planet.name,
          coordinates: coords,
          fields: { used: 0, total: 0 },
          isHomeworld: i === 0,
        });
      }

      return planetInfos;
    } catch (error) {
      console.error('❌ Error obteniendo planetas:', error);
      return [];
    }
  }

  calculateAstrophysicsCost(currentLevel: number): { metal: number; crystal: number; deuterium: number } {
    const nextLevel = currentLevel + 1;
    const factor = Math.pow(ASTROPHYSICS_BASE_COST.factor, nextLevel - 1);

    return {
      metal: Math.round(ASTROPHYSICS_BASE_COST.metal * factor / 100) * 100,
      crystal: Math.round(ASTROPHYSICS_BASE_COST.crystal * factor / 100) * 100,
      deuterium: Math.round(ASTROPHYSICS_BASE_COST.deuterium * factor / 100) * 100,
    };
  }
}

export const colonizationManager = new ColonizationManager();
