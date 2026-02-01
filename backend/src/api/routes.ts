import { Router, Request, Response } from 'express';
import { ogameClient } from '../browser/ogame-client.js';
import { browserManager } from '../browser/browser-manager.js';
import { taskScheduler } from '../scheduler/task-scheduler.js';

export const router = Router();

// Estado del bot
router.get('/status', (_req: Request, res: Response) => {
  res.json({
    browserInitialized: browserManager.isInitialized(),
    loggedIn: ogameClient.getLoginStatus(),
  });
});

// Login automático
router.post('/login', async (_req: Request, res: Response) => {
  try {
    const success = await ogameClient.login();
    res.json({ success });
  } catch (error) {
    res.status(500).json({ error: 'Error durante el login' });
  }
});

// Login manual (solo prepara el navegador, usuario selecciona universo)
router.post('/manual-login', async (_req: Request, res: Response) => {
  try {
    const success = await ogameClient.manualLogin();
    res.json({ success });
  } catch (error) {
    res.status(500).json({ error: 'Error durante el login manual' });
  }
});

// Marcar como logueado manualmente
router.post('/set-logged-in', async (_req: Request, res: Response) => {
  try {
    const success = await ogameClient.setLoggedIn();
    res.json({ success });
  } catch (error) {
    res.status(500).json({ error: 'Error estableciendo estado de login' });
  }
});

// Forzar actualización de estado (para debug)
router.get('/force-status', (_req: Request, res: Response) => {
  res.json({
    browserInitialized: browserManager.isInitialized(),
    loggedIn: ogameClient.getLoginStatus(),
    pageExists: !!ogameClient.page,
    currentUrl: ogameClient.page?.url() || 'No page',
  });
});

// Obtener recursos
router.get('/resources', async (_req: Request, res: Response) => {
  try {
    const resources = await ogameClient.getResources();
    if (resources) {
      res.json(resources);
    } else {
      res.status(400).json({ error: 'No se pudieron obtener los recursos' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo recursos' });
  }
});

// Obtener planetas
router.get('/planets', async (_req: Request, res: Response) => {
  try {
    const planets = await ogameClient.getPlanets();
    res.json(planets);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo planetas' });
  }
});

// Obtener información de almacenes
router.get('/storage', async (_req: Request, res: Response) => {
  try {
    const storage = await ogameClient.getStorageInfo();
    if (storage) {
      res.json(storage);
    } else {
      res.status(400).json({ error: 'No se pudo obtener información de almacenes' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo información de almacenes' });
  }
});

// Navegar a una página
router.post('/navigate', async (req: Request, res: Response) => {
  try {
    const { page } = req.body;
    await ogameClient.navigateTo(page as any);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error durante la navegación' });
  }
});

// Cerrar navegador
router.post('/close', (_req: Request, res: Response) => {
  try {
    browserManager.close();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error cerrando el navegador' });
  }
});

// ========== TAREAS PROGRAMADAS ==========

// Obtener todas las tareas programadas
router.get('/tasks', (_req: Request, res: Response) => {
  try {
    const tasks = taskScheduler.getTasks();
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo tareas' });
  }
});

// Obtener estado del scheduler
router.get('/scheduler/status', (_req: Request, res: Response) => {
  try {
    const status = taskScheduler.getStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo estado del scheduler' });
  }
});

// Actualizar tarea (habilitar/deshabilitar, cambiar intervalo)
router.put('/tasks/:taskId', (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const updates = req.body;
    
    const success = taskScheduler.updateTask(taskId, updates);
    
    if (success) {
      const updatedTask = taskScheduler.getTask(taskId);
      res.json(updatedTask);
    } else {
      res.status(404).json({ error: 'Tarea no encontrada' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error actualizando tarea' });
  }
});

// Ejecutar tarea manualmente
router.post('/tasks/:taskId/execute', async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const result = await taskScheduler.executeTask(taskId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Error ejecutando tarea' });
  }
});

// Iniciar scheduler
router.post('/scheduler/start', (_req: Request, res: Response) => {
  try {
    taskScheduler.start();
    res.json({ success: true, message: 'Scheduler iniciado' });
  } catch (error) {
    res.status(500).json({ error: 'Error iniciando scheduler' });
  }
});

// Detener scheduler
router.post('/scheduler/stop', (_req: Request, res: Response) => {
  try {
    taskScheduler.stop();
    res.json({ success: true, message: 'Scheduler detenido' });
  } catch (error) {
    res.status(500).json({ error: 'Error deteniendo scheduler' });
  }
});
