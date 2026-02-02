import { ogameClient } from '../browser/ogame-client.js';
import { Resources } from '../browser/ogame-client.js';
import { expansionPolicy } from '../expansion/index.js';
import { maximizeMinesPolicy } from '../mines/index.js';
import { gameDataService } from '../data-sync/index.js';

export interface ScheduledTask {
  id: string;
  name: string;
  enabled: boolean;
  interval: number; // en minutos
  lastRun?: Date;
  nextRun?: Date;
}

export interface TaskResult {
  success: boolean;
  message: string;
  resources?: Resources;
}

export class TaskScheduler {
  private tasks: Map<string, ScheduledTask> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private isRunning = false;

  constructor() {
    this.setupDefaultTasks();
  }

  private setupDefaultTasks(): void {
    // Tarea de maximizar minas
    this.addTask({
      id: 'maximize-mines',
      name: 'Maximizar Minas',
      enabled: false,
      interval: 1, // cada 1 minuto
    });

    // Tarea de política expansionista
    this.addTask({
      id: 'expansion-policy',
      name: 'Política Expansionista',
      enabled: false,
      interval: 30, // cada 30 minutos
    });
  }

  addTask(task: ScheduledTask): void {
    this.tasks.set(task.id, task);
    if (task.enabled) {
      this.scheduleTask(task);
    }
  }

  removeTask(taskId: string): void {
    this.stopTask(taskId);
    this.tasks.delete(taskId);
  }

  getTasks(): ScheduledTask[] {
    return Array.from(this.tasks.values());
  }

  getTask(taskId: string): ScheduledTask | undefined {
    return this.tasks.get(taskId);
  }

  updateTask(taskId: string, updates: Partial<ScheduledTask>): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    const wasEnabled = task.enabled;
    Object.assign(task, updates);

    if (wasEnabled && !task.enabled) {
      this.stopTask(taskId);
    } else if (!wasEnabled && task.enabled) {
      this.scheduleTask(task);
    } else if (task.enabled) {
      // Reiniciar si el intervalo cambió
      this.stopTask(taskId);
      this.scheduleTask(task);
    }

    return true;
  }

  private scheduleTask(task: ScheduledTask): void {
    this.stopTask(task.id);

    const interval = setInterval(async () => {
      await this.executeTask(task.id);
    }, task.interval * 60 * 1000);

    this.intervals.set(task.id, interval);
    console.log(`⏰ Tarea "${task.name}" programada cada ${task.interval} minutos`);
  }

  private stopTask(taskId: string): void {
    const interval = this.intervals.get(taskId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(taskId);
      console.log(`⏹️ Tarea "${taskId}" detenida`);
    }
  }

  /**
   * Programa la siguiente ejecución de una tarea después de X segundos
   * Útil para esperar a que termine una construcción
   */
  private scheduleNextRun(taskId: string, delaySeconds: number): void {
    const task = this.tasks.get(taskId);
    if (!task) return;

    // Detener el intervalo actual
    this.stopTask(taskId);

    // Programar una ejecución única después del delay
    const timeout = setTimeout(async () => {
      await this.executeTask(taskId);
      
      // Después de ejecutar, volver al intervalo normal si la tarea sigue habilitada
      const currentTask = this.tasks.get(taskId);
      if (currentTask?.enabled) {
        this.scheduleTask(currentTask);
      }
    }, delaySeconds * 1000);

    // Guardar el timeout como si fuera un interval (para poder cancelarlo)
    this.intervals.set(taskId, timeout as unknown as NodeJS.Timeout);
    
    const minutes = Math.floor(delaySeconds / 60);
    const seconds = delaySeconds % 60;
    const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
    
    task.nextRun = new Date(Date.now() + delaySeconds * 1000);
    console.log(`⏰ Próxima ejecución de "${task.name}" programada en ${timeStr}`);
  }

  async executeTask(taskId: string): Promise<TaskResult> {
    const task = this.tasks.get(taskId);
    if (!task) {
      return { success: false, message: 'Tarea no encontrada' };
    }

    // No ejecutar si el scheduler está parado
    if (!this.isRunning) {
      return { success: false, message: 'Scheduler parado - no se ejecuta la tarea' };
    }

    // No ejecutar si la sincronización de datos está deshabilitada
    const dataSyncStatus = gameDataService.getStatus();
    if (!dataSyncStatus.enabled) {
      return { success: false, message: 'Sincronización de datos deshabilitada - las tareas programadas requieren data-sync activo' };
    }

    if (!ogameClient.getLoginStatus()) {
      return { success: false, message: 'No hay sesión activa en OGame' };
    }

    console.log(`🚀 Ejecutando tarea: ${task.name}`);
    task.lastRun = new Date();
    task.nextRun = new Date(Date.now() + task.interval * 60 * 1000);

    try {
      switch (taskId) {
        case 'maximize-mines':
          // Nueva lógica: delega en maximizeMinesPolicy
          const result = await maximizeMinesPolicy.execute();
          return { success: result.success, message: result.message };
        case 'expansion-policy':
          return await this.executeExpansionPolicy();
        default:
          return { success: false, message: 'Tarea desconocida' };
      }
    } catch (error) {
      console.error(`❌ Error ejecutando tarea ${task.name}:`, error);
      return { success: false, message: `Error: ${error}` };
    }
  }

  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('🚀 Scheduler iniciado');

    // Iniciar todas las tareas habilitadas
    for (const task of this.tasks.values()) {
      if (task.enabled) {
        this.scheduleTask(task);
      }
    }
  }

  stop(): void {
    if (!this.isRunning) return;

    // Detener todas las tareas
    for (const taskId of this.intervals.keys()) {
      this.stopTask(taskId);
    }

    this.isRunning = false;
    console.log('⏹️ Scheduler detenido');
  }

  getStatus(): { isRunning: boolean; tasks: ScheduledTask[] } {
    return {
      isRunning: this.isRunning,
      tasks: this.getTasks(),
    };
  }

  private async executeExpansionPolicy(): Promise<TaskResult> {
    try {
      console.log('\n🌍 ========== POLÍTICA EXPANSIONISTA ==========');

      // Habilitar temporalmente la política para esta ejecución
      const currentConfig = expansionPolicy.getConfig();
      if (!currentConfig.enabled) {
        expansionPolicy.updateConfig({ enabled: true });
      }

      const result = await expansionPolicy.execute();

      // Restaurar estado original
      if (!currentConfig.enabled) {
        expansionPolicy.updateConfig({ enabled: false });
      }

      const resources = await ogameClient.getResources();

      return {
        success: result.success,
        message: result.message,
        resources: resources || undefined,
      };
    } catch (error) {
      console.error('❌ Error en política expansionista:', error);
      return {
        success: false,
        message: `Error en política expansionista: ${error}`,
      };
    }
  }
}

export const taskScheduler = new TaskScheduler();
