/**
 * Tipos para el módulo de sincronización de datos del juego
 */

import { MineLevels, StorageLevels } from '../game/ogame-formulas.js';

export interface BuildingLevels {
  // Suministros
  metalMine: number;
  crystalMine: number;
  deuteriumSynthesizer: number;
  solarPlant: number;
  fusionReactor: number;
  metalStorage: number;
  crystalStorage: number;
  deuteriumStorage: number;
  // Instalaciones
  roboticsFactory: number;
  shipyard: number;
  researchLab: number;
  allianceDepot: number;
  missileSilo: number;
  naniteFactory: number;
  terraformer: number;
  spaceDock: number;
}

export interface TechnologyLevels {
  // Investigación básica
  energyTechnology: number;
  laserTechnology: number;
  ionTechnology: number;
  hyperspaceTechnology: number;
  plasmaTechnology: number;
  // Propulsión
  combustionDrive: number;
  impulseDrive: number;
  hyperspaceDrive: number;
  // Investigación avanzada
  espionageTechnology: number;
  computerTechnology: number;
  astrophysics: number;
  intergalacticResearchNetwork: number;
  gravitonTechnology: number;
  weaponsTechnology: number;
  shieldingTechnology: number;
  armourTechnology: number;
}

export interface FleetCounts {
  // Naves civiles
  smallCargo: number;
  largeCargo: number;
  colonyShip: number;
  recycler: number;
  espionageProbe: number;
  solarSatellite: number;
  // Naves de combate
  lightFighter: number;
  heavyFighter: number;
  cruiser: number;
  battleship: number;
  battlecruiser: number;
  bomber: number;
  destroyer: number;
  deathstar: number;
  reaper: number;
  pathfinder: number;
}

export interface DefenseCounts {
  rocketLauncher: number;
  lightLaser: number;
  heavyLaser: number;
  gaussCannon: number;
  ionCannon: number;
  plasmaTurret: number;
  smallShieldDome: number;
  largeShieldDome: number;
  antiBallisticMissiles: number;
  interplanetaryMissiles: number;
}

export interface PlanetData {
  id: string;
  name: string;
  coordinates: string;
  resources: {
    metal: number;
    crystal: number;
    deuterium: number;
    energy: number;
  };
  buildings: Partial<BuildingLevels>;
  fleet: Partial<FleetCounts>;
  defense: Partial<DefenseCounts>;
}

export interface PlanetGameData {
  id: string;
  name: string;
  coordinates: string;
  mineLevels: MineLevels;
  storageLevels: StorageLevels;
  resources: {
    metal: number;
    crystal: number;
    deuterium: number;
    energy: number;
  };
}

export interface ProductionQueueItem {
  inProduction: boolean;
  remainingSeconds: number;
  endTime: number | null;
  name?: string;
}

export interface ProductionQueue {
  buildings: ProductionQueueItem;
  research: ProductionQueueItem;
  shipyard: ProductionQueueItem;
}

export interface GameData {
  lastUpdate: Date;
  isUpdating: boolean;
  planets: PlanetGameData[];
  technologies: Partial<TechnologyLevels>;
  productionQueue: ProductionQueue | null;
  // Planeta actualmente seleccionado
  currentPlanetId: string | null;
}

export interface DataSyncConfig {
  enabled: boolean;
  intervalSeconds: number;
  syncBuildings: boolean;
  syncTechnologies: boolean;
  syncFleet: boolean;
  syncDefense: boolean;
}

export const DEFAULT_DATA_SYNC_CONFIG: DataSyncConfig = {
  enabled: false,
  intervalSeconds: 60,
  syncBuildings: true,
  syncTechnologies: true,
  syncFleet: false,
  syncDefense: false,
};
