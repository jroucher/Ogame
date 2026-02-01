import { Component, inject, signal, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { ApiService, BotStatus, Resources, Planet, StorageInfo } from '../../services/api.service';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, DatePipe],
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
            (click)="login()"
            [disabled]="loading() || status()?.loggedIn"
            class="btn btn-primary">
            {{ loading() ? 'Conectando...' : 'Login Automático' }}
          </button>
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
          <button
            (click)="refreshData()"
            [disabled]="!status()?.loggedIn"
            class="btn btn-secondary">
            Actualizar Datos
          </button>
        </div>
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
            @for (task of tasks(); track task.id) {
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
  `],
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);
  private refreshSubscription?: Subscription;

  status = signal<BotStatus | null>(null);
  resources = signal<Resources | null>(null);
  planets = signal<Planet[]>([]);
  tasks = signal<any[]>([]);
  schedulerStatus = signal<any>(null);
  storageInfo = signal<StorageInfo | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.checkStatus();
    this.loadTasks();
    this.loadSchedulerStatus();
    this.refreshSubscription = interval(10000).subscribe(() => {
      if (this.status()?.loggedIn) {
        this.refreshData();
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
}
