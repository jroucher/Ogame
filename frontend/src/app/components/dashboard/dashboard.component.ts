import { Component, inject, signal, computed, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, BotStatus, Resources, Planet, StorageInfo, DataSyncStatus, MineLevels, TechnologyLevels, PlanetGameData } from '../../services/api.service';
import { interval, Subscription } from 'rxjs';
import { isFeatureEnabled } from '../../config/feature-flags.config';

@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, DatePipe, FormsModule],
  template: `
    <div class="dashboard">
      <header class="header">
        <h1>🚀 OGame Bot</h1>
        <div class="status-badge" [class.online]="status()?.loggedIn">
          {{ status()?.loggedIn ? 'Conectado' : 'Desconectado' }}
        </div>
      </header>

      <section class="controls">
        <h2>Controles</h2>
        <div class="button-group">
          <button
            (click)="manualLogin()"
            [disabled]="loading() || status()?.loggedIn"
            class="btn btn-info">
            {{ loading() ? 'Preparando...' : 'Login Manual' }}
          </button>
          <button
            (click)="setLoggedIn()"
            [disabled]="loading() || status()?.loggedIn"
            class="btn btn-success">
            Marcar como Conectado
          </button>
          <button
            (click)="closeBrowser()"
            [disabled]="!status()?.browserInitialized"
            class="btn btn-danger">
            Cerrar Navegador
          </button>
        </div>
      </section>

      <section class="data-sync" [class.disabled]="!status()?.loggedIn">
        <h2>🔄 Sincronización de Datos</h2>
        <div class="sync-controls">
          <div class="sync-toggle">
            <label class="switch">
              <input
                type="checkbox"
                [checked]="dataSyncStatus()?.enabled"
                (change)="toggleDataSync($event)"
                [disabled]="!status()?.loggedIn">
              <span class="slider"></span>
            </label>
            <span class="sync-label">
              {{ dataSyncStatus()?.enabled ? 'Sincronización Activa' : 'Sincronización Inactiva' }}
            </span>
          </div>
          <div class="sync-interval">
            <label>Intervalo (segundos):</label>
            <input
              type="number"
              [ngModel]="syncInterval()"
              (ngModelChange)="onIntervalChange($event)"
              min="10"
              max="300"
              [disabled]="!status()?.loggedIn || !!dataSyncStatus()?.enabled"
              class="interval-input">
          </div>
          <button
            (click)="syncNow()"
            [disabled]="!status()?.loggedIn || dataSyncStatus()?.isUpdating"
            class="btn btn-secondary btn-sm">
            {{ dataSyncStatus()?.isUpdating ? 'Sincronizando...' : 'Sincronizar Ahora' }}
          </button>
        </div>
        @if (dataSyncStatus()?.lastUpdate) {
          <div class="sync-info">
            <span>Última actualización: {{ dataSyncStatus()!.lastUpdate | date:'medium' }}</span>
            <span class="data-age" [class.stale]="(dataSyncStatus()?.dataAge ?? 0) > 120">
              (hace {{ dataSyncStatus()!.dataAge }}s)
            </span>
          </div>
        }
        @if (cachedMineLevels() || cachedTechnologies()) {
          <div class="cached-data">
            <h4>Datos en Caché</h4>
            @if (cachedMineLevels()) {
              <div class="data-section">
                <h5>🏭 Edificios @if (currentPlanetName()) { <span class="planet-tag">{{ currentPlanetName() }}</span> }</h5>
                <div class="data-grid">
                  <span>Metal: {{ cachedMineLevels()!.metal }}</span>
                  <span>Cristal: {{ cachedMineLevels()!.crystal }}</span>
                  <span>Deuterio: {{ cachedMineLevels()!.deuterium }}</span>
                  <span>Solar: {{ cachedMineLevels()!.solar }}</span>
                  <span>Satélites: {{ cachedMineLevels()!.solarSatellites }}</span>
                </div>
              </div>
            }
            @if (cachedTechnologies()) {
              <div class="data-section">
                <h5>🔬 Tecnologías</h5>
                <div class="data-grid">
                  @if (cachedTechnologies()!.energyTechnology) {
                    <span>Energía: {{ cachedTechnologies()!.energyTechnology }}</span>
                  }
                  @if (cachedTechnologies()!.laserTechnology) {
                    <span>Láser: {{ cachedTechnologies()!.laserTechnology }}</span>
                  }
                  @if (cachedTechnologies()!.ionTechnology) {
                    <span>Iones: {{ cachedTechnologies()!.ionTechnology }}</span>
                  }
                  @if (cachedTechnologies()!.hyperspaceTechnology) {
                    <span>Hiperespacio: {{ cachedTechnologies()!.hyperspaceTechnology }}</span>
                  }
                  @if (cachedTechnologies()!.plasmaTechnology) {
                    <span>Plasma: {{ cachedTechnologies()!.plasmaTechnology }}</span>
                  }
                  @if (cachedTechnologies()!.combustionDrive) {
                    <span>Combustión: {{ cachedTechnologies()!.combustionDrive }}</span>
                  }
                  @if (cachedTechnologies()!.impulseDrive) {
                    <span>Impulso: {{ cachedTechnologies()!.impulseDrive }}</span>
                  }
                  @if (cachedTechnologies()!.hyperspaceDrive) {
                    <span>Propulsor Hip.: {{ cachedTechnologies()!.hyperspaceDrive }}</span>
                  }
                  @if (cachedTechnologies()!.espionageTechnology) {
                    <span>Espionaje: {{ cachedTechnologies()!.espionageTechnology }}</span>
                  }
                  @if (cachedTechnologies()!.computerTechnology) {
                    <span>Ordenadores: {{ cachedTechnologies()!.computerTechnology }}</span>
                  }
                  @if (cachedTechnologies()!.astrophysics) {
                    <span>Astrofísica: {{ cachedTechnologies()!.astrophysics }}</span>
                  }
                  @if (cachedTechnologies()!.weaponsTechnology) {
                    <span>Armas: {{ cachedTechnologies()!.weaponsTechnology }}</span>
                  }
                  @if (cachedTechnologies()!.shieldingTechnology) {
                    <span>Escudo: {{ cachedTechnologies()!.shieldingTechnology }}</span>
                  }
                  @if (cachedTechnologies()!.armourTechnology) {
                    <span>Blindaje: {{ cachedTechnologies()!.armourTechnology }}</span>
                  }
                </div>
              </div>
            }
          </div>
        }
      </section>

      @if (status()?.loggedIn) {
        <section class="resources">
          <h2>Recursos</h2>
          @if (resources()) {
            <div class="resource-grid">
              <div class="resource-card metal">
                <span class="label">Metal</span>
                <span class="value">{{ resources()!.metal | number }}</span>
                @if (storageInfo()) {
                  <div class="storage-bar">
                    <div class="storage-fill" [style.width.%]="getStoragePercent('metal')"></div>
                  </div>
                  <span class="storage-info">{{ resources()!.metal | number }} / {{ storageInfo()!.capacities.metal | number }}</span>
                }
              </div>
              <div class="resource-card crystal">
                <span class="label">Cristal</span>
                <span class="value">{{ resources()!.crystal | number }}</span>
                @if (storageInfo()) {
                  <div class="storage-bar">
                    <div class="storage-fill" [style.width.%]="getStoragePercent('crystal')"></div>
                  </div>
                  <span class="storage-info">{{ resources()!.crystal | number }} / {{ storageInfo()!.capacities.crystal | number }}</span>
                }
              </div>
              <div class="resource-card deuterium">
                <span class="label">Deuterio</span>
                <span class="value">{{ resources()!.deuterium | number }}</span>
                @if (storageInfo()) {
                  <div class="storage-bar">
                    <div class="storage-fill" [style.width.%]="getStoragePercent('deuterium')"></div>
                  </div>
                  <span class="storage-info">{{ resources()!.deuterium | number }} / {{ storageInfo()!.capacities.deuterium | number }}</span>
                }
              </div>
              <div class="resource-card energy">
                <span class="label">Energía</span>
                <span class="value">{{ resources()!.energy | number }}</span>
              </div>
            </div>
          }
        </section>

        <section class="planets">
          <h2>Planetas</h2>
          <div class="planet-list">
            @for (planet of planets(); track planet.id) {
              <div class="planet-card">
                <span class="planet-name">{{ planet.name }}</span>
                <span class="planet-coords">{{ planet.coordinates }}</span>
              </div>
            }
          </div>
        </section>

        <section class="scheduled-tasks">
          <h2>Acciones Programadas</h2>
          @if (schedulerStatus()) {
            <div class="scheduler-status">
              <span class="status-indicator" [class.active]="schedulerStatus()!.isRunning">
                {{ schedulerStatus()!.isRunning ? '🟢 Activo' : '🔴 Inactivo' }}
              </span>
              <button
                (click)="toggleScheduler()"
                [disabled]="loading()"
                class="btn btn-sm">
                {{ schedulerStatus()!.isRunning ? 'Detener' : 'Iniciar' }}
              </button>
            </div>
          }

          <div class="tasks-list">
            @for (task of visibleTasks(); track task.id) {
              <div class="task-card" [class.active]="task.enabled">
                <div class="task-info">
                  <h3>{{ task.name }}</h3>
                  <p class="task-interval">Cada {{ task.interval }} minutos</p>
                  @if (task.lastRun) {
                    <p class="task-last-run">Última ejecución: {{ task.lastRun | date:'short' }}</p>
                  }
                  @if (task.nextRun) {
                    <p class="task-next-run">Próxima ejecución: {{ task.nextRun | date:'short' }}</p>
                  }
                </div>
                <div class="task-controls">
                  <label class="switch">
                    <input
                      type="checkbox"
                      [checked]="task.enabled"
                      (change)="toggleTask(task.id, $event)"
                      [disabled]="loading()">
                    <span class="slider"></span>
                  </label>
                  <button
                    (click)="executeTask(task.id)"
                    [disabled]="loading() || !status()?.loggedIn"
                    class="btn btn-sm btn-secondary">
                    Ejecutar Ahora
                  </button>
                </div>
              </div>
            }
          </div>
        </section>

        <section class="navigation">
          <h2>Navegación</h2>
          <div class="nav-buttons">
            <button (click)="navigate('overview')" class="btn btn-nav">Vista General</button>
            <button (click)="navigate('resources')" class="btn btn-nav">Recursos</button>
            <button (click)="navigate('facilities')" class="btn btn-nav">Instalaciones</button>
            <button (click)="navigate('research')" class="btn btn-nav">Investigación</button>
            <button (click)="navigate('shipyard')" class="btn btn-nav">Hangar</button>
            <button (click)="navigate('fleet')" class="btn btn-nav">Flota</button>
            <button (click)="navigate('galaxy')" class="btn btn-nav">Galaxia</button>
          </div>
        </section>
      }

      @if (error()) {
        <div class="error-message">
          {{ error() }}
        </div>
      }
    </div>
  `,
  styles: [`
    .dashboard {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
      font-family: 'Segoe UI', system-ui, sans-serif;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      padding-bottom: 1rem;
      border-bottom: 2px solid #333;
    }

    h1 {
      margin: 0;
      color: #fff;
    }

    h2 {
      color: #aaa;
      font-size: 1.2rem;
      margin-bottom: 1rem;
    }

    .status-badge {
      padding: 0.5rem 1rem;
      border-radius: 20px;
      background: #dc3545;
      color: white;
      font-weight: bold;
    }

    .status-badge.online {
      background: #28a745;
    }

    section {
      background: #1a1a2e;
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }

    .button-group {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .btn {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: bold;
      transition: all 0.2s;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-primary {
      background: #4a90d9;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #357abd;
    }

    .btn-secondary {
      background: #6c757d;
      color: white;
    }

    .btn-danger {
      background: #dc3545;
      color: white;
    }

    .btn-info {
      background: #17a2b8;
      color: white;
    }

    .btn-info:hover:not(:disabled) {
      background: #138496;
    }

    .btn-success {
      background: #28a745;
      color: white;
    }

    .btn-success:hover:not(:disabled) {
      background: #218838;
    }

    .btn-nav {
      background: #2d2d44;
      color: #fff;
      border: 1px solid #444;
    }

    .btn-nav:hover {
      background: #3d3d54;
    }

    .resource-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
    }

    .resource-card {
      padding: 1.5rem;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .resource-card .label {
      font-size: 0.9rem;
      opacity: 0.8;
    }

    .resource-card .value {
      font-size: 1.5rem;
      font-weight: bold;
      margin-top: 0.5rem;
    }

    .metal { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
    .crystal { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; }
    .deuterium { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; }
    .energy { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); color: white; }

    .storage-bar {
      width: 100%;
      height: 8px;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 4px;
      margin-top: 0.75rem;
      overflow: hidden;
    }

    .storage-fill {
      height: 100%;
      background: rgba(255, 255, 255, 0.8);
      border-radius: 4px;
      transition: width 0.3s ease;
    }

    .storage-info {
      font-size: 0.75rem;
      opacity: 0.7;
      margin-top: 0.25rem;
    }

    .planet-list {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .planet-card {
      background: #2d2d44;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
    }

    .planet-name {
      font-weight: bold;
      color: #fff;
    }

    .planet-coords {
      color: #888;
      font-size: 0.9rem;
    }

    .nav-buttons {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .error-message {
      background: #dc3545;
      color: white;
      padding: 1rem;
      border-radius: 8px;
      margin-top: 1rem;
    }

    // Estilos para tareas programadas
    .scheduled-tasks {
      background: #1e1e2e;
      border-radius: 12px;
      padding: 1.5rem;
      border: 1px solid #444;
    }

    .scheduler-status {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      padding: 0.5rem;
      background: #2d2d44;
      border-radius: 6px;
    }

    .status-indicator {
      font-weight: bold;
    }

    .status-indicator.active {
      color: #28a745;
    }

    .tasks-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .task-card {
      background: #2d2d44;
      border-radius: 8px;
      padding: 1rem;
      border: 1px solid #444;
      transition: all 0.3s;
    }

    .task-card.active {
      border-color: #28a745;
      box-shadow: 0 0 10px rgba(40, 167, 69, 0.3);
    }

    .task-info {
      flex: 1;
    }

    .task-info h3 {
      margin: 0 0 0.5rem 0;
      color: #fff;
      font-size: 1.1rem;
    }

    .task-interval {
      color: #888;
      font-size: 0.9rem;
      margin: 0.25rem 0;
    }

    .task-last-run,
    .task-next-run {
      color: #666;
      font-size: 0.8rem;
      margin: 0.25rem 0;
    }

    .task-controls {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-top: 1rem;
    }

    // Switch toggle
    .switch {
      position: relative;
      display: inline-block;
      width: 50px;
      height: 24px;
    }

    .switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #6c757d;
      transition: .4s;
      border-radius: 24px;
    }

    .slider:before {
      position: absolute;
      content: "";
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: .4s;
      border-radius: 50%;
    }

    input:checked + .slider {
      background-color: #28a745;
    }

    input:checked + .slider:before {
      transform: translateX(26px);
    }

    .btn-sm {
      padding: 0.25rem 0.5rem;
      font-size: 0.8rem;
    }

    // Estilos para sincronización de datos
    .data-sync {
      background: #1e1e2e;
      border-radius: 12px;
      padding: 1.5rem;
      border: 1px solid #444;
    }

    .data-sync.disabled {
      opacity: 0.6;
    }

    .sync-controls {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      flex-wrap: wrap;
    }

    .sync-toggle {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .sync-label {
      font-weight: bold;
      color: #fff;
    }

    .sync-interval {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .sync-interval label {
      color: #aaa;
      font-size: 0.9rem;
    }

    .interval-input {
      width: 80px;
      padding: 0.5rem;
      border: 1px solid #444;
      border-radius: 6px;
      background: #2d2d44;
      color: #fff;
      text-align: center;
    }

    .interval-input:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .sync-info {
      margin-top: 1rem;
      padding: 0.75rem;
      background: #2d2d44;
      border-radius: 6px;
      font-size: 0.9rem;
      color: #aaa;
    }

    .data-age {
      margin-left: 0.5rem;
      color: #28a745;
    }

    .data-age.stale {
      color: #ffc107;
    }

    .cached-data {
      margin-top: 1rem;
      padding: 1rem;
      background: #2d2d44;
      border-radius: 8px;
    }

    .cached-data h4 {
      margin: 0 0 0.75rem 0;
      color: #fff;
      font-size: 0.95rem;
    }

    .data-section {
      margin-bottom: 1rem;
    }

    .data-section:last-child {
      margin-bottom: 0;
    }

    .data-section h5 {
      margin: 0 0 0.5rem 0;
      color: #aaa;
      font-size: 0.85rem;
    }

    .data-grid {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
      font-size: 0.85rem;
      color: #ccc;
    }

    .data-grid span {
      background: #1a1a2e;
      padding: 0.35rem 0.7rem;
      border-radius: 4px;
    }

    .planet-tag {
      background: #3a3a5e;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: normal;
      margin-left: 0.5rem;
    }
  `],
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);
  private refreshSubscription?: Subscription;

  status = signal<BotStatus | null>(null);
  resources = signal<Resources | null>(null);
  planets = signal<Planet[]>([]);
  tasks = signal<any[]>([]);
  visibleTasks = computed(() => this.tasks().filter((task) => isFeatureEnabled(task.id)));
  schedulerStatus = signal<any>(null);
  storageInfo = signal<StorageInfo | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  // Data Sync
  dataSyncStatus = signal<DataSyncStatus | null>(null);
  cachedMineLevels = signal<MineLevels | null>(null);
  cachedTechnologies = signal<TechnologyLevels | null>(null);
  cachedPlanets = signal<PlanetGameData[]>([]);
  currentPlanetName = signal<string>('');
  syncInterval = signal(60);

  ngOnInit(): void {
    this.checkStatus();
    this.loadTasks();
    this.loadSchedulerStatus();
    this.loadDataSyncStatus();
    this.refreshSubscription = interval(10000).subscribe(() => {
      // Solo refrescar datos si la sincronización está habilitada
      if (this.status()?.loggedIn && this.dataSyncStatus()?.enabled) {
        this.loadDataSyncStatus();
      }
      this.loadSchedulerStatus();
    });
  }

  getStoragePercent(resource: 'metal' | 'crystal' | 'deuterium'): number {
    const res = this.resources();
    const storage = this.storageInfo();
    if (!res || !storage) return 0;
    const current = res[resource];
    const capacity = storage.capacities[resource];
    if (capacity === 0) return 0;
    return Math.min(100, (current / capacity) * 100);
  }

  ngOnDestroy(): void {
    this.refreshSubscription?.unsubscribe();
  }

  checkStatus(): void {
    this.api.getStatus().subscribe({
      next: (status) => this.status.set(status),
      error: () => this.error.set('No se puede conectar con el backend'),
    });
  }

  login(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.login().subscribe({
      next: (result) => {
        this.loading.set(false);
        if (result.success) {
          this.checkStatus();
          this.refreshData();
        } else {
          this.error.set('Error durante el login');
        }
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Error de conexión durante el login');
      },
    });
  }

  refreshData(): void {
    this.api.getResources().subscribe({
      next: (resources) => this.resources.set(resources),
    });
    this.api.getPlanets().subscribe({
      next: (planets) => this.planets.set(planets),
    });
    this.api.getStorageInfo().subscribe({
      next: (storage) => this.storageInfo.set(storage),
      error: () => console.log('No se pudo obtener información de almacenes'),
    });
  }

  navigate(page: string): void {
    this.api.navigate(page).subscribe();
  }

  manualLogin(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.manualLogin().subscribe({
      next: (result) => {
        this.loading.set(false);
        if (result.success) {
          this.error.set('Login manual iniciado. Por favor selecciona tu universo en el navegador y luego haz clic en "Marcar como Conectado".');
        } else {
          this.error.set('Error durante el login manual');
        }
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Error de conexión durante el login manual');
      },
    });
  }

  setLoggedIn(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.setLoggedIn().subscribe({
      next: (result) => {
        this.loading.set(false);
        if (result.success) {
          // Forzar actualización de estado
          setTimeout(() => {
            this.checkStatus();
            this.refreshData();
          }, 1000);
          this.error.set(null);
        } else {
          this.error.set('No se pudo establecer el estado de login. Asegúrate de estar en el juego.');
        }
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Error estableciendo estado de login');
      },
    });
  }

  closeBrowser(): void {
    this.api.closeBrowser().subscribe({
      next: () => {
        this.status.set({ browserInitialized: false, loggedIn: false });
        this.resources.set(null);
        this.planets.set([]);
      },
    });
  }

  // ========== MÉTODOS DE TAREAS PROGRAMADAS ==========

  loadTasks(): void {
    this.api.getTasks().subscribe({
      next: (tasks) => this.tasks.set(tasks),
      error: () => console.error('Error cargando tareas'),
    });
  }

  loadSchedulerStatus(): void {
    this.api.getSchedulerStatus().subscribe({
      next: (status) => this.schedulerStatus.set(status),
      error: () => console.error('Error cargando estado del scheduler'),
    });
  }

  toggleScheduler(): void {
    if (this.schedulerStatus()?.isRunning) {
      this.api.stopScheduler().subscribe({
        next: () => {
          this.loadSchedulerStatus();
          this.error.set('Scheduler detenido');
        },
        error: () => this.error.set('Error deteniendo scheduler'),
      });
    } else {
      this.api.startScheduler().subscribe({
        next: () => {
          this.loadSchedulerStatus();
          this.error.set('Scheduler iniciado');
        },
        error: () => this.error.set('Error iniciando scheduler'),
      });
    }
  }

  toggleTask(taskId: string, event: any): void {
    const enabled = event.target.checked;
    this.api.updateTask(taskId, { enabled }).subscribe({
      next: () => {
        this.loadTasks();
        this.error.set(enabled ? `Tarea habilitada` : `Tarea deshabilitada`);
      },
      error: () => this.error.set('Error actualizando tarea'),
    });
  }

  executeTask(taskId: string): void {
    this.loading.set(true);
    this.api.executeTask(taskId).subscribe({
      next: (result) => {
        this.loading.set(false);
        if (result.success) {
          this.error.set(`Tarea ejecutada: ${result.message}`);
          this.refreshData();
        } else {
          this.error.set(`Error en tarea: ${result.message}`);
        }
        this.loadTasks();
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Error ejecutando tarea');
      },
    });
  }

  // ========== SINCRONIZACIÓN DE DATOS ==========

  loadDataSyncStatus(): void {
    this.api.getDataSyncStatus().subscribe({
      next: (status) => {
        this.dataSyncStatus.set(status);
        this.syncInterval.set(status.intervalSeconds);

        // Cargar datos cacheados del juego
        if (status.enabled) {
          this.api.getGameData().subscribe({
            next: (data) => {
              // Guardar todos los planetas
              if (data.planets) {
                this.cachedPlanets.set(data.planets);
              }

              // Encontrar el planeta actual
              const currentPlanet = data.planets?.find(p => p.id === data.currentPlanetId) || data.planets?.[0];
              if (currentPlanet) {
                this.cachedMineLevels.set(currentPlanet.mineLevels);
                this.resources.set(currentPlanet.resources);
                this.currentPlanetName.set(`${currentPlanet.name} ${currentPlanet.coordinates}`);
              }
              if (data.technologies) {
                this.cachedTechnologies.set(data.technologies);
              }
            },
            error: () => {},
          });
        }
      },
      error: () => console.error('Error cargando estado de sincronización'),
    });
  }

  toggleDataSync(event: Event): void {
    const enabled = (event.target as HTMLInputElement).checked;
    if (enabled) {
      this.api.startDataSync(this.syncInterval()).subscribe({
        next: () => {
          this.loadDataSyncStatus();
          this.error.set('Sincronización de datos iniciada');
        },
        error: () => this.error.set('Error iniciando sincronización'),
      });
    } else {
      this.api.stopDataSync().subscribe({
        next: () => {
          this.loadDataSyncStatus();
          this.error.set('Sincronización de datos detenida');
        },
        error: () => this.error.set('Error deteniendo sincronización'),
      });
    }
  }

  onIntervalChange(value: number): void {
    this.syncInterval.set(value);
  }

  syncNow(): void {
    this.api.syncDataNow().subscribe({
      next: () => {
        this.loadDataSyncStatus();
        this.error.set('Datos sincronizados');
      },
      error: () => this.error.set('Error sincronizando datos'),
    });
  }
}
