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
}
