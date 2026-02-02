import { Router, Request, Response } from 'express';
import { ogameClient } from '../browser/ogame-client.js';
import { browserManager } from '../browser/browser-manager.js';
import { taskScheduler } from '../scheduler/task-scheduler.js';
import { expansionPolicy, galaxyScanner } from '../expansion/index.js';
import { gameDataService } from '../data-sync/index.js';

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

// ========== POLÍTICA EXPANSIONISTA ==========

// Obtener estado de la política expansionista
router.get('/expansion/status', async (_req: Request, res: Response) => {
  try {
    const status = await expansionPolicy.getStatus();
    if (status) {
      res.json(status);
    } else {
      res.status(400).json({ error: 'No se pudo obtener el estado de expansión' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo estado de expansión' });
  }
});

// Obtener configuración de expansión
router.get('/expansion/config', (_req: Request, res: Response) => {
  try {
    const config = expansionPolicy.getConfig();
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo configuración' });
  }
});

// Actualizar configuración de expansión
router.put('/expansion/config', (req: Request, res: Response) => {
  try {
    const updates = req.body;
    expansionPolicy.updateConfig(updates);
    res.json(expansionPolicy.getConfig());
  } catch (error) {
    res.status(500).json({ error: 'Error actualizando configuración' });
  }
});

// Escanear sistemas cercanos
router.post('/expansion/scan', async (req: Request, res: Response) => {
  try {
    const { radius } = req.body;
    if (radius) {
      expansionPolicy.updateConfig({ scanRadius: radius });
    }
    const targets = await expansionPolicy.scanAndGetTargets();
    res.json({
      success: true,
      targetsFound: targets.length,
      targets: targets.slice(0, 20),
    });
  } catch (error) {
    res.status(500).json({ error: 'Error escaneando sistemas' });
  }
});

// Obtener objetivos de colonización en caché
router.get('/expansion/targets', (_req: Request, res: Response) => {
  try {
    const targets = expansionPolicy.getCachedTargets();
    res.json(targets);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo objetivos' });
  }
});

// Ejecutar política expansionista manualmente
router.post('/expansion/execute', async (_req: Request, res: Response) => {
  try {
    const result = await expansionPolicy.execute();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Error ejecutando política expansionista' });
  }
});

// Limpiar caché de escaneo
router.post('/expansion/clear-cache', (_req: Request, res: Response) => {
  try {
    expansionPolicy.clearCache();
    galaxyScanner.clearCache();
    res.json({ success: true, message: 'Caché limpiada' });
  } catch (error) {
    res.status(500).json({ error: 'Error limpiando caché' });
  }
});

// ========== SINCRONIZACIÓN DE DATOS ==========

// Obtener estado de la sincronización de datos
router.get('/data-sync/status', (_req: Request, res: Response) => {
  try {
    const status = gameDataService.getStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo estado de sincronización' });
  }
});

// Obtener configuración de sincronización
router.get('/data-sync/config', (_req: Request, res: Response) => {
  try {
    const config = gameDataService.getConfig();
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo configuración' });
  }
});

// Actualizar configuración de sincronización
router.put('/data-sync/config', (req: Request, res: Response) => {
  try {
    const updates = req.body;
    const config = gameDataService.updateConfig(updates);
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: 'Error actualizando configuración' });
  }
});

// Iniciar sincronización de datos
router.post('/data-sync/start', (req: Request, res: Response) => {
  try {
    const { intervalSeconds } = req.body;
    if (intervalSeconds) {
      gameDataService.updateConfig({ intervalSeconds });
    }
    gameDataService.updateConfig({ enabled: true });
    res.json({ success: true, message: 'Sincronización iniciada', config: gameDataService.getConfig() });
  } catch (error) {
    res.status(500).json({ error: 'Error iniciando sincronización' });
  }
});

// Detener sincronización de datos
router.post('/data-sync/stop', (_req: Request, res: Response) => {
  try {
    gameDataService.updateConfig({ enabled: false });
    res.json({ success: true, message: 'Sincronización detenida' });
  } catch (error) {
    res.status(500).json({ error: 'Error deteniendo sincronización' });
  }
});

// Forzar sincronización inmediata
router.post('/data-sync/sync-now', async (_req: Request, res: Response) => {
  try {
    const data = await gameDataService.syncAllData();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: 'Error sincronizando datos' });
  }
});

// Obtener datos cacheados del juego
router.get('/data-sync/game-data', (_req: Request, res: Response) => {
  try {
    const data = gameDataService.getGameData();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo datos del juego' });
  }
});

// Obtener niveles de minas cacheados
router.get('/data-sync/mine-levels', (_req: Request, res: Response) => {
  try {
    const levels = gameDataService.getMineLevelsFromCache();
    if (levels) {
      res.json(levels);
    } else {
      res.status(404).json({ error: 'No hay datos de minas en caché' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo niveles de minas' });
  }
});

// Obtener tecnologías cacheadas
router.get('/data-sync/technologies', (_req: Request, res: Response) => {
  try {
    const technologies = gameDataService.getTechnologiesFromCache();
    res.json(technologies);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo tecnologías' });
  }
});
