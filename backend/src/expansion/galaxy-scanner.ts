/**
 * Galaxy Scanner - Escanea sistemas solares para encontrar posiciones de colonización
 */

import { ogameClient } from '../browser/ogame-client.js';
import {
  Coordinates,
  GalaxyPosition,
  GalaxyScanResult,
  ColonizationTarget,
  POSITION_DATA,
  POSITION_SCORES,
} from './expansion-types.js';

export class GalaxyScanner {
  private scanCache: Map<string, GalaxyScanResult> = new Map();
  private readonly CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutos

  private getCacheKey(galaxy: number, system: number): string {
    return `${galaxy}:${system}`;
  }

  private isCacheValid(result: GalaxyScanResult): boolean {
    const age = Date.now() - result.scanTime.getTime();
    return age < this.CACHE_DURATION_MS;
  }

  async scanSystem(galaxy: number, system: number): Promise<GalaxyScanResult | null> {
    const cacheKey = this.getCacheKey(galaxy, system);
    const cached = this.scanCache.get(cacheKey);

    if (cached && this.isCacheValid(cached)) {
      console.log(`📋 Usando caché para sistema [${galaxy}:${system}]`);
      return cached;
    }

    if (!ogameClient.page || !ogameClient.getLoginStatus()) {
      console.log('❌ No hay sesión activa para escanear galaxia');
      return null;
    }

    try {
      console.log(`🔭 Escaneando sistema [${galaxy}:${system}]...`);

      await ogameClient.navigateTo('galaxy');
      await ogameClient.page.waitForTimeout(2000);

      await this.navigateToSystem(galaxy, system);
      await ogameClient.page.waitForTimeout(2000);

      const positions = await this.extractPositions();

      const result: GalaxyScanResult = {
        galaxy,
        system,
        positions,
        scanTime: new Date(),
      };

      this.scanCache.set(cacheKey, result);
      console.log(`✅ Sistema [${galaxy}:${system}] escaneado: ${positions.filter(p => p.isEmpty).length} posiciones vacías`);

      return result;
    } catch (error) {
      console.error(`❌ Error escaneando sistema [${galaxy}:${system}]:`, error);
      return null;
    }
  }

  private async navigateToSystem(galaxy: number, system: number): Promise<void> {
    if (!ogameClient.page) return;

    const galaxyInput = ogameClient.page.locator('#galaxy_input, input[name="galaxy"]').first();
    const systemInput = ogameClient.page.locator('#system_input, input[name="system"]').first();

    if (await galaxyInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await galaxyInput.fill(galaxy.toString());
    }

    if (await systemInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await systemInput.fill(system.toString());
    }

    const submitButton = ogameClient.page.locator('button[type="submit"], .btn_blue, #galaxyHeader .btn').first();
    if (await submitButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await submitButton.click();
      await ogameClient.page.waitForTimeout(2000);
    } else {
      await ogameClient.page.keyboard.press('Enter');
      await ogameClient.page.waitForTimeout(2000);
    }
  }

  private async extractPositions(): Promise<GalaxyPosition[]> {
    if (!ogameClient.page) return [];

    const positions: GalaxyPosition[] = [];

    for (let pos = 1; pos <= 15; pos++) {
      const position = await this.extractPosition(pos);
      positions.push(position);
    }

    return positions;
  }

  private async extractPosition(position: number): Promise<GalaxyPosition> {
    if (!ogameClient.page) {
      return { position, isEmpty: true };
    }

    try {
      const rowSelector = `#galaxyRow${position}, tr[data-position="${position}"], .galaxyRow:nth-child(${position})`;
      const row = ogameClient.page.locator(rowSelector).first();

      if (!await row.isVisible({ timeout: 500 }).catch(() => false)) {
        const altRow = ogameClient.page.locator(`#galaxytable tbody tr:nth-child(${position})`).first();
        if (!await altRow.isVisible({ timeout: 500 }).catch(() => false)) {
          return { position, isEmpty: true };
        }
      }

      const planetCell = ogameClient.page.locator(`${rowSelector} .cellPlanet, ${rowSelector} td:nth-child(2)`).first();
      const hasPlanet = await planetCell.locator('a, .planetname, [class*="planet"]').first()
        .isVisible({ timeout: 300 }).catch(() => false);

      if (!hasPlanet) {
        return { position, isEmpty: true };
      }

      const planetName = await planetCell.locator('.planetname, a').first().textContent() || '';
      const playerCell = ogameClient.page.locator(`${rowSelector} .cellPlayerName, ${rowSelector} td:nth-child(6)`).first();
      const playerName = await playerCell.textContent() || '';

      const statusCell = ogameClient.page.locator(`${rowSelector} .cellStatus, ${rowSelector} td:nth-child(7)`).first();
      const statusText = await statusCell.textContent() || '';

      const isInactive = statusText.includes('i') || statusText.includes('I');
      const isBanned = statusText.includes('b') || statusText.includes('B');
      const isVacation = statusText.includes('v') || statusText.includes('V') || statusText.includes('u') || statusText.includes('U');

      const debrisCell = ogameClient.page.locator(`${rowSelector} .cellDebris, ${rowSelector} td:nth-child(4)`).first();
      let debrisField: { metal: number; crystal: number } | undefined;

      if (await debrisCell.locator('.debris, [class*="debris"]').first().isVisible({ timeout: 300 }).catch(() => false)) {
        const debrisText = await debrisCell.textContent() || '';
        const metalMatch = debrisText.match(/Metal:\s*([\d.,]+)/i);
        const crystalMatch = debrisText.match(/Crystal:\s*([\d.,]+)/i);

        if (metalMatch || crystalMatch) {
          debrisField = {
            metal: metalMatch ? parseInt(metalMatch[1].replace(/[.,]/g, '')) : 0,
            crystal: crystalMatch ? parseInt(crystalMatch[1].replace(/[.,]/g, '')) : 0,
          };
        }
      }

      const moonCell = ogameClient.page.locator(`${rowSelector} .cellMoon, ${rowSelector} td:nth-child(3)`).first();
      const hasMoon = await moonCell.locator('a, [class*="moon"]').first()
        .isVisible({ timeout: 300 }).catch(() => false);

      return {
        position,
        isEmpty: false,
        planetName: planetName.trim(),
        playerName: playerName.trim(),
        isInactive,
        isBanned,
        isVacation,
        debrisField,
        moon: hasMoon,
      };
    } catch {
      return { position, isEmpty: true };
    }
  }

  async scanNearbySystemsForColonization(
    homeCoords: Coordinates,
    radius: number,
    preferredPositions: number[] = [8, 7, 9, 6, 10],
    astrophysicsLevel: number = 1
  ): Promise<ColonizationTarget[]> {
    const targets: ColonizationTarget[] = [];
    const colonizableRange = this.getColonizablePositions(astrophysicsLevel);

    console.log(`\n🔭 ========== ESCANEO DE COLONIZACIÓN ==========`);
    console.log(`📍 Planeta base: [${homeCoords.galaxy}:${homeCoords.system}:${homeCoords.position}]`);
    console.log(`📏 Radio de búsqueda: ±${radius} sistemas`);
    console.log(`🎯 Posiciones preferidas: ${preferredPositions.join(', ')}`);
    console.log(`🔬 Posiciones colonizables (Astrofísica ${astrophysicsLevel}): ${colonizableRange.min}-${colonizableRange.max}`);

    const systemsToScan: Array<{ galaxy: number; system: number }> = [];

    for (let offset = 0; offset <= radius; offset++) {
      if (offset === 0) {
        systemsToScan.push({ galaxy: homeCoords.galaxy, system: homeCoords.system });
      } else {
        const systemPlus = homeCoords.system + offset;
        const systemMinus = homeCoords.system - offset;

        if (systemPlus <= 499) {
          systemsToScan.push({ galaxy: homeCoords.galaxy, system: systemPlus });
        }
        if (systemMinus >= 1) {
          systemsToScan.push({ galaxy: homeCoords.galaxy, system: systemMinus });
        }
      }
    }

    for (const { galaxy, system } of systemsToScan) {
      const scanResult = await this.scanSystem(galaxy, system);

      if (!scanResult) continue;

      for (const pos of scanResult.positions) {
        if (!pos.isEmpty) continue;

        if (pos.position < colonizableRange.min || pos.position > colonizableRange.max) {
          continue;
        }

        const target = this.evaluatePosition(
          { galaxy, system, position: pos.position },
          homeCoords,
          preferredPositions
        );

        targets.push(target);
      }

      await ogameClient.page?.waitForTimeout(1000);
    }

    targets.sort((a, b) => b.score - a.score);

    console.log(`\n📊 Resultados del escaneo:`);
    console.log(`   - Sistemas escaneados: ${systemsToScan.length}`);
    console.log(`   - Posiciones vacías encontradas: ${targets.length}`);

    if (targets.length > 0) {
      console.log(`\n🏆 Top 5 mejores posiciones:`);
      for (const target of targets.slice(0, 5)) {
        console.log(`   [${target.coordinates.galaxy}:${target.coordinates.system}:${target.coordinates.position}] - Score: ${target.score}, Campos: ${target.estimatedFields.min}-${target.estimatedFields.max}`);
      }
    }

    return targets;
  }

  private evaluatePosition(
    coords: Coordinates,
    homeCoords: Coordinates,
    preferredPositions: number[]
  ): ColonizationTarget {
    const posData = POSITION_DATA[coords.position];
    const baseScore = POSITION_SCORES[coords.position] || 50;

    const preferenceIndex = preferredPositions.indexOf(coords.position);
    const preferenceBonus = preferenceIndex >= 0 ? (preferredPositions.length - preferenceIndex) * 5 : 0;

    const systemDistance = Math.abs(coords.system - homeCoords.system);
    const galaxyDistance = Math.abs(coords.galaxy - homeCoords.galaxy);
    const totalDistance = galaxyDistance * 100 + systemDistance;
    const distanceBonus = Math.max(0, 20 - totalDistance);

    const score = baseScore + preferenceBonus + distanceBonus;

    const travelTimeSeconds = this.calculateTravelTime(homeCoords, coords);

    return {
      coordinates: coords,
      score,
      estimatedFields: { min: posData.fieldsMin, max: posData.fieldsMax },
      temperatureRange: { min: posData.tempMin, max: posData.tempMax },
      productionBonus: {
        metal: posData.metalBonus,
        crystal: posData.crystalBonus,
      },
      distanceFromHome: totalDistance,
      travelTimeSeconds,
    };
  }

  private calculateTravelTime(from: Coordinates, to: Coordinates, fleetSpeed: number = 2500): number {
    let distance: number;

    if (from.galaxy !== to.galaxy) {
      distance = Math.abs(from.galaxy - to.galaxy) * 20000;
    } else if (from.system !== to.system) {
      distance = Math.abs(from.system - to.system) * 5 * 19 + 2700;
    } else {
      distance = Math.abs(from.position - to.position) * 5 + 1000;
    }

    const time = Math.round((10 + 35000 / fleetSpeed * Math.sqrt(distance * 10 / fleetSpeed)) / 1);
    return time;
  }

  private getColonizablePositions(astrophysicsLevel: number): { min: number; max: number } {
    if (astrophysicsLevel >= 8) return { min: 1, max: 15 };
    if (astrophysicsLevel >= 6) return { min: 2, max: 14 };
    if (astrophysicsLevel >= 4) return { min: 3, max: 13 };
    return { min: 4, max: 12 };
  }

  clearCache(): void {
    this.scanCache.clear();
    console.log('🗑️ Caché de escaneo limpiada');
  }

  getCachedSystems(): string[] {
    return Array.from(this.scanCache.keys());
  }
}

export const galaxyScanner = new GalaxyScanner();
