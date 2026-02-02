import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface BotStatus {
  browserInitialized: boolean;
  loggedIn: boolean;
}

export interface Resources {
  metal: number;
  crystal: number;
  deuterium: number;
  energy: number;
}

export interface Planet {
  id: string;
  name: string;
  coordinates: string;
}

export interface StorageInfo {
  levels: {
    metal: number;
    crystal: number;
    deuterium: number;
  };
  capacities: {
    metal: number;
    crystal: number;
    deuterium: number;
  };
}

export interface DataSyncStatus {
  enabled: boolean;
  isUpdating: boolean;
  lastUpdate: string;
  intervalSeconds: number;
  dataAge: number;
}

export interface DataSyncConfig {
  enabled: boolean;
  intervalSeconds: number;
  syncBuildings: boolean;
  syncTechnologies: boolean;
  syncFleet: boolean;
  syncDefense: boolean;
}

export interface MineLevels {
  metal: number;
  crystal: number;
  deuterium: number;
  solar: number;
  solarSatellites: number;
}

export interface TechnologyLevels {
  energyTechnology?: number;
  laserTechnology?: number;
  ionTechnology?: number;
  hyperspaceTechnology?: number;
  plasmaTechnology?: number;
  combustionDrive?: number;
  impulseDrive?: number;
  hyperspaceDrive?: number;
  espionageTechnology?: number;
  computerTechnology?: number;
  astrophysics?: number;
  weaponsTechnology?: number;
  shieldingTechnology?: number;
  armourTechnology?: number;
}

export interface PlanetGameData {
  id: string;
  name: string;
  coordinates: string;
  mineLevels: MineLevels;
  storageLevels: {
    metal: number;
    crystal: number;
    deuterium: number;
  };
  resources: {
    metal: number;
    crystal: number;
    deuterium: number;
    energy: number;
  };
}

export interface GameDataResponse {
  lastUpdate: string;
  isUpdating: boolean;
  planets: PlanetGameData[];
  technologies: TechnologyLevels;
  currentPlanetId: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:3000/api';

  getStatus(): Observable<BotStatus> {
    return this.http.get<BotStatus>(`${this.baseUrl}/status`);
  }

  login(): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.baseUrl}/login`, {});
  }

  manualLogin(): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.baseUrl}/manual-login`, {});
  }

  setLoggedIn(): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.baseUrl}/set-logged-in`, {});
  }

  getResources(): Observable<Resources> {
    return this.http.get<Resources>(`${this.baseUrl}/resources`);
  }

  getPlanets(): Observable<Planet[]> {
    return this.http.get<Planet[]>(`${this.baseUrl}/planets`);
  }

  navigate(page: string): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.baseUrl}/navigate`, { page });
  }

  closeBrowser(): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.baseUrl}/close`, {});
  }

  // ========== TAREAS PROGRAMADAS ==========

  getTasks(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/tasks`);
  }

  getSchedulerStatus(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/scheduler/status`);
  }

  updateTask(taskId: string, updates: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/tasks/${taskId}`, updates);
  }

  executeTask(taskId: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/tasks/${taskId}/execute`, {});
  }

  startScheduler(): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.baseUrl}/scheduler/start`, {});
  }

  stopScheduler(): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.baseUrl}/scheduler/stop`, {});
  }

  getStorageInfo(): Observable<StorageInfo> {
    return this.http.get<StorageInfo>(`${this.baseUrl}/storage`);
  }

  // ========== SINCRONIZACIÓN DE DATOS ==========

  getDataSyncStatus(): Observable<DataSyncStatus> {
    return this.http.get<DataSyncStatus>(`${this.baseUrl}/data-sync/status`);
  }

  getDataSyncConfig(): Observable<DataSyncConfig> {
    return this.http.get<DataSyncConfig>(`${this.baseUrl}/data-sync/config`);
  }

  updateDataSyncConfig(config: Partial<DataSyncConfig>): Observable<DataSyncConfig> {
    return this.http.put<DataSyncConfig>(`${this.baseUrl}/data-sync/config`, config);
  }

  startDataSync(intervalSeconds?: number): Observable<{ success: boolean; message: string; config: DataSyncConfig }> {
    return this.http.post<{ success: boolean; message: string; config: DataSyncConfig }>(
      `${this.baseUrl}/data-sync/start`,
      { intervalSeconds }
    );
  }

  stopDataSync(): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.baseUrl}/data-sync/stop`, {});
  }

  syncDataNow(): Observable<{ success: boolean; data: any }> {
    return this.http.post<{ success: boolean; data: any }>(`${this.baseUrl}/data-sync/sync-now`, {});
  }

  getGameData(): Observable<GameDataResponse> {
    return this.http.get<GameDataResponse>(`${this.baseUrl}/data-sync/game-data`);
  }

  getCachedMineLevels(): Observable<MineLevels> {
    return this.http.get<MineLevels>(`${this.baseUrl}/data-sync/mine-levels`);
  }

  getCachedTechnologies(): Observable<TechnologyLevels> {
    return this.http.get<TechnologyLevels>(`${this.baseUrl}/data-sync/technologies`);
  }
}
