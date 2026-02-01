/**
 * Tipos e interfaces para el módulo de Política Expansionista
 */

export interface Coordinates {
  galaxy: number;
  system: number;
  position: number;
}

export interface GalaxyPosition {
  position: number;
  isEmpty: boolean;
  planetName?: string;
  playerName?: string;
  playerId?: string;
  isInactive?: boolean;
  isBanned?: boolean;
  isVacation?: boolean;
  alliance?: string;
  debrisField?: DebrisField;
  moon?: boolean;
}

export interface DebrisField {
  metal: number;
  crystal: number;
}

export interface GalaxyScanResult {
  galaxy: number;
  system: number;
  positions: GalaxyPosition[];
  scanTime: Date;
}

export interface ColonizationTarget {
  coordinates: Coordinates;
  score: number;
  estimatedFields: { min: number; max: number };
  temperatureRange: { min: number; max: number };
  productionBonus: {
    metal: number;
    crystal: number;
  };
  distanceFromHome: number;
  travelTimeSeconds: number;
}

export interface ExpansionConfig {
  enabled: boolean;
  maxColonies: number;
  preferredPositions: number[];
  minPlanetFields: number;
  scanRadius: number;
  autoRecolonize: boolean;
  prioritizeAstrophysics: boolean;
}

export interface AstrophysicsInfo {
  level: number;
  maxColonies: number;
  currentColonies: number;
  availableSlots: number;
  maxExpeditions: number;
  colonizablePositions: { min: number; max: number };
}

export interface ColonyShipStatus {
  available: number;
  inProduction: boolean;
  productionTime?: number;
  canBuild: boolean;
  cost: {
    metal: number;
    crystal: number;
    deuterium: number;
  };
}

export interface ExpansionStatus {
  config: ExpansionConfig;
  astrophysics: AstrophysicsInfo;
  colonyShips: ColonyShipStatus;
  currentPlanets: PlanetInfo[];
  pendingColonization?: {
    target: ColonizationTarget;
    arrivalTime: Date;
  };
  lastScan?: Date;
  nextAction: ExpansionAction;
}

export interface PlanetInfo {
  id: string;
  name: string;
  coordinates: Coordinates;
  fields: { used: number; total: number };
  temperature?: { min: number; max: number };
  isHomeworld: boolean;
}

export type ExpansionAction =
  | { type: 'WAIT'; reason: string; waitUntil?: Date }
  | { type: 'RESEARCH_ASTROPHYSICS'; reason: string }
  | { type: 'BUILD_COLONY_SHIP'; reason: string }
  | { type: 'SCAN_GALAXY'; galaxy: number; system: number }
  | { type: 'COLONIZE'; target: ColonizationTarget }
  | { type: 'ABANDON_PLANET'; planetId: string; reason: string };

// Constantes de posiciones de planetas
export const POSITION_DATA: Record<number, {
  fieldsMin: number;
  fieldsMax: number;
  tempMin: number;
  tempMax: number;
  metalBonus: number;
  crystalBonus: number;
}> = {
  1:  { fieldsMin: 96,  fieldsMax: 172, tempMin: 220, tempMax: 260, metalBonus: 0,   crystalBonus: 40 },
  2:  { fieldsMin: 104, fieldsMax: 176, tempMin: 170, tempMax: 210, metalBonus: 0,   crystalBonus: 30 },
  3:  { fieldsMin: 112, fieldsMax: 182, tempMin: 120, tempMax: 160, metalBonus: 0,   crystalBonus: 20 },
  4:  { fieldsMin: 118, fieldsMax: 208, tempMin: 70,  tempMax: 110, metalBonus: 0,   crystalBonus: 0 },
  5:  { fieldsMin: 133, fieldsMax: 224, tempMin: 60,  tempMax: 100, metalBonus: 0,   crystalBonus: 0 },
  6:  { fieldsMin: 148, fieldsMax: 236, tempMin: 50,  tempMax: 90,  metalBonus: 17,  crystalBonus: 0 },
  7:  { fieldsMin: 163, fieldsMax: 248, tempMin: 40,  tempMax: 80,  metalBonus: 23,  crystalBonus: 0 },
  8:  { fieldsMin: 178, fieldsMax: 310, tempMin: 30,  tempMax: 70,  metalBonus: 35,  crystalBonus: 0 },
  9:  { fieldsMin: 163, fieldsMax: 248, tempMin: 20,  tempMax: 60,  metalBonus: 23,  crystalBonus: 0 },
  10: { fieldsMin: 148, fieldsMax: 236, tempMin: 10,  tempMax: 50,  metalBonus: 17,  crystalBonus: 0 },
  11: { fieldsMin: 133, fieldsMax: 224, tempMin: 0,   tempMax: 40,  metalBonus: 0,   crystalBonus: 0 },
  12: { fieldsMin: 118, fieldsMax: 208, tempMin: -10, tempMax: 30,  metalBonus: 0,   crystalBonus: 0 },
  13: { fieldsMin: 112, fieldsMax: 182, tempMin: -50, tempMax: -10, metalBonus: 0,   crystalBonus: 0 },
  14: { fieldsMin: 104, fieldsMax: 176, tempMin: -90, tempMax: -50, metalBonus: 0,   crystalBonus: 0 },
  15: { fieldsMin: 96,  fieldsMax: 172, tempMin: -130,tempMax: -90, metalBonus: 0,   crystalBonus: 0 },
};

// Puntuación base de cada posición para colonización
export const POSITION_SCORES: Record<number, number> = {
  8: 100,   // Mejor posición (máximo metal + campos grandes)
  7: 85,
  9: 85,
  6: 70,
  10: 70,
  5: 55,
  11: 55,
  4: 40,
  12: 40,
  15: 60,   // Bonus por deuterio
  14: 50,
  13: 45,
  3: 35,
  2: 30,
  1: 25,
};

// Campos mínimos aceptables por posición
export const MIN_ACCEPTABLE_FIELDS: Record<number, number> = {
  1: 150,
  2: 150,
  3: 150,
  4: 150,
  5: 150,
  6: 170,
  7: 180,
  8: 200,
  9: 180,
  10: 170,
  11: 150,
  12: 150,
  13: 150,
  14: 150,  // Aceptamos menos campos en posición 15 por el deuterio
  15: 150,
};

export const DEFAULT_MIN_FIELDS = 150;

// Costos de nave colonizadora
export const COLONY_SHIP_COST = {
  metal: 10000,
  crystal: 20000,
  deuterium: 10000,
};

// Requisitos de Astrofísica
export const ASTROPHYSICS_REQUIREMENTS = {
  researchLab: 3,
  espionageTech: 4,
  impulseDrive: 3,
};

// Fórmula de costo de Astrofísica: BaseCost * 1.75^(level-1)
export const ASTROPHYSICS_BASE_COST = {
  metal: 4000,
  crystal: 8000,
  deuterium: 4000,
  factor: 1.75,
};
