import { Page } from 'playwright';
import { browserManager } from './browser-manager.js';
import { config } from '../config/index.js';

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

export class OGameClient {
  public page: Page | null = null;
  private isLoggedIn = false;

  async login(): Promise<boolean> {
    try {
      this.page = await browserManager.getPage();
      
      // Navegar al lobby de OGame
      await this.page.goto('https://lobby.ogame.gameforge.com/');
      await this.page.waitForLoadState('networkidle');
      console.log('📍 Página del lobby cargada');

      // Aceptar cookies si aparece el banner
      const cookieButton = this.page.getByRole('button', { name: 'Accept Cookies' });
      if (await cookieButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await cookieButton.click();
        console.log('🍪 Cookies aceptadas');
        await this.page.waitForTimeout(1000);
      }

      // Click en el tab "Log in" para mostrar el formulario de login
      const loginTab = this.page.getByText('Log in').first();
      await loginTab.waitFor({ state: 'visible', timeout: 5000 });
      await loginTab.click();
      console.log('📝 Tab de login clickeado');
      await this.page.waitForTimeout(500);

      // Rellenar credenciales usando los textboxes del formulario
      const emailInput = this.page.locator('input[type="email"], input[placeholder*="mail"]').first();
      const passwordInput = this.page.locator('input[type="password"]').first();
      
      await emailInput.waitFor({ state: 'visible', timeout: 5000 });
      await emailInput.fill(config.ogame.email);
      console.log('📧 Email introducido');
      
      await passwordInput.fill(config.ogame.password);
      console.log('🔑 Password introducido');

      // Click en el botón "Log in" del formulario
      const loginButton = this.page.getByRole('button', { name: 'Log in' });
      await loginButton.click();
      console.log('🚀 Botón de login clickeado');
      
      // Esperar a que cargue la pantalla intermedia y hacer click en el botón "Play"
      await this.page.waitForTimeout(3000);
      
      // Buscar y hacer click en el botón "Play" de la pantalla intermedia
      const initialPlayButton = this.page.locator('button:has-text("Play"), button:has-text("PLAY")').first();
      if (await initialPlayButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await initialPlayButton.click();
        console.log('▶️ Botón Play intermedio clickeado');
        await this.page.waitForTimeout(3000);
      }

      // Cerrar cualquier popup/modal que pueda aparecer
      await this.closePopups();

      const serverNumber = config.ogame.serverNumber;
      const universeName = config.ogame.universeName;
      console.log(`📋 Buscando servidor s${serverNumber} (${universeName}) con bandera de España...`);

      let clicked = false;

      // Buscar todas las filas de la tabla "Tus cuentas"
      // Necesitamos encontrar la fila que tenga Ophiuchus + bandera de España
      const allRows = await this.page.locator('tr').all();
      
      for (const row of allRows) {
        const rowText = await row.textContent() || '';
        
        // Verificar si esta fila contiene el nombre del universo
        if (rowText.includes(universeName)) {
          // Verificar si tiene la bandera de España (imagen con src que contenga "es" o similar)
          const spainFlagImg = row.locator('img[src*="/es."], img[src*="_es_"], img[src*="spain"], img[src*="/es/"]').first();
          const hasSpainFlag = await spainFlagImg.isVisible({ timeout: 500 }).catch(() => false);
          
          console.log(`🔍 Fila encontrada: "${rowText.substring(0, 50)}..." - Bandera España: ${hasSpainFlag}`);
          
          if (hasSpainFlag) {
            console.log(`🌌 Universo ${universeName} con bandera de España encontrado`);
            
            // Intentar múltiples métodos para activar y clickear el botón Play
            
            // Método 1: Click directo en la última celda (donde está el botón)
            const lastCell = row.locator('td').last();
            try {
              await lastCell.click();
              console.log(`🎮 Click en última celda de ${universeName} (España)`);
              clicked = true;
              break;
            } catch {
              console.log('⚠️ Click directo en celda falló');
            }
            
            // Método 2: Usar JavaScript para simular hover y click
            try {
              await row.evaluate((element) => {
                // Crear evento mouseover usando el constructor del navegador
                const event = new (element.ownerDocument.defaultView as any).MouseEvent('mouseover', { bubbles: true });
                element.dispatchEvent(event);
                const playBtn = element.querySelector('button');
                if (playBtn) {
                  playBtn.click();
                }
              });
              console.log(`🎮 JavaScript hover + click para ${universeName} (España)`);
              clicked = true;
              break;
            } catch {
              console.log('⚠️ JavaScript hover + click falló');
            }
            
            // Método 3: Hover tradicional y buscar botón
            try {
              await row.hover();
              await this.page.waitForTimeout(1000);
              
              const playBtn = row.locator('button:has-text("Play")').first();
              if (await playBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
                await playBtn.click();
                console.log(`🎮 Botón Play clickeado después de hover para ${universeName} (España)`);
                clicked = true;
                break;
              }
            } catch {
              console.log('⚠️ Hover tradicional falló');
            }
          }
        }
      }

      // Fallback: si no encontramos con bandera de España, buscar solo por nombre
      if (!clicked) {
        console.log('⚠️ No se encontró con bandera de España, buscando solo por nombre...');
        for (const row of allRows) {
          const rowText = await row.textContent() || '';
          if (rowText.includes(universeName)) {
            const playBtn = row.locator('button:has-text("Play")').first();
            if (await playBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
              await playBtn.click();
              console.log(`🎮 Botón Play clickeado para ${universeName}`);
              clicked = true;
              break;
            } else {
              await row.hover();
              await this.page.waitForTimeout(500);
              const hoverPlayBtn = row.locator('button:has-text("Play")').first();
              if (await hoverPlayBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
                await hoverPlayBtn.click();
                console.log(`🎮 Botón Play clickeado después de hover para ${universeName}`);
                clicked = true;
                break;
              }
            }
          }
        }
      }

      if (!clicked) {
        console.log('⚠️ No se encontró botón de Jugar. Tomando screenshot para debug...');
        await this.page.screenshot({ path: 'lobby-debug.png' });
        console.log('📸 Screenshot guardado en lobby-debug.png');
      }

      // Esperar a que cargue el juego
      await this.page.waitForTimeout(8000);
      
      // Verificar si estamos en el juego buscando elementos típicos
      const inGame = await this.page.locator('#planetList, #resources, .OGameClock, #ingamepage').first().isVisible({ timeout: 10000 }).catch(() => false);
      
      if (inGame) {
        this.isLoggedIn = true;
        console.log('✅ Login exitoso en OGame');
        return true;
      } else {
        console.log('⚠️ No se pudo verificar entrada al juego. Revisa lobby-debug.png');
        // Tomar screenshot del estado actual
        await this.page.screenshot({ path: 'game-state-debug.png' });
        this.isLoggedIn = true;
        return true;
      }
    } catch (error) {
      console.error('❌ Error durante el login:', error);
      return false;
    }
  }

  async manualLogin(): Promise<boolean> {
    try {
      this.page = await browserManager.getPage();
      
      // Navegar al lobby de OGame
      await this.page.goto('https://lobby.ogame.gameforge.com/');
      await this.page.waitForLoadState('networkidle');
      console.log('📍 Página del lobby cargada para login manual');

      // Aceptar cookies si aparece el banner
      const cookieButton = this.page.getByRole('button', { name: 'Accept Cookies' });
      if (await cookieButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await cookieButton.click();
        console.log('🍪 Cookies aceptadas');
        await this.page.waitForTimeout(1000);
      }

      // Click en el tab "Log in" para mostrar el formulario de login
      const loginTab = this.page.getByText('Log in').first();
      await loginTab.waitFor({ state: 'visible', timeout: 5000 });
      await loginTab.click();
      console.log('📝 Tab de login clickeado');
      await this.page.waitForTimeout(500);

      // Rellenar credenciales usando los textboxes del formulario
      const emailInput = this.page.locator('input[type="email"], input[placeholder*="mail"]').first();
      const passwordInput = this.page.locator('input[type="password"]').first();
      
      await emailInput.waitFor({ state: 'visible', timeout: 5000 });
      await emailInput.fill(config.ogame.email);
      console.log('📧 Email introducido');
      
      await passwordInput.fill(config.ogame.password);
      console.log('🔑 Password introducido');

      // Click en el botón "Log in" del formulario
      const loginButton = this.page.getByRole('button', { name: 'Log in' });
      await loginButton.click();
      console.log('🚀 Botón de login clickeado');
      
      // Esperar a que cargue la pantalla intermedia
      await this.page.waitForTimeout(3000);
      
      // Buscar y hacer click en el botón "Play" de la pantalla intermedia
      const initialPlayButton = this.page.locator('button:has-text("Play"), button:has-text("PLAY")').first();
      if (await initialPlayButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await initialPlayButton.click();
        console.log('▶️ Botón Play intermedio clickeado');
        await this.page.waitForTimeout(3000);
      }

      // Cerrar cualquier popup/modal que pueda aparecer
      await this.closePopups();

      console.log('🎮 Login manual completado. Por favor selecciona tu universo manualmente.');
      console.log('📋 Una vez en el juego, usa el endpoint /api/set-logged-in para marcar como logueado.');
      
      // Esperar a que el usuario seleccione universo y se abra nueva pestaña
      console.log('⏳ Esperando a que se abra nueva pestaña del juego...');
      
      // Escuchar nuevas pestañas que se abran
      const context = this.page.context();
      let gameTabOpened = false;
      
      // Configurar listener para nuevas páginas
      context.on('page', () => {
        console.log('🔥 Nueva pestaña detectada');
        gameTabOpened = true;
      });
      
      // Esperar un máximo de 30 segundos por nueva pestaña
      for (let i = 0; i < 30; i++) {
        if (gameTabOpened) {
          console.log('✅ Pestaña del juego detectada');
          break;
        }
        await this.page.waitForTimeout(1000);
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error durante el login manual:', error);
      return false;
    }
  }

  async setLoggedIn(): Promise<boolean> {
    try {
      if (!this.page) {
        console.log('⚠️ No hay página activa. Inicia login manual primero.');
        return false;
      }

      // Buscar si hay pestañas de juego abiertas y cambiar a ellas
      const context = this.page.context();
      const pages = context.pages();
      
      // Buscar pestaña que esté en el juego (no en lobby)
      let gamePage: Page | null = null;
      for (const page of pages) {
        const url = page.url();
        if (url.includes('ogame.gameforge.com/game') && !url.includes('lobby')) {
          gamePage = page;
          console.log(`🎮 Pestaña de juego encontrada: ${url}`);
          break;
        }
      }
      
      // Si encontramos pestaña de juego, usar esa
      if (gamePage) {
        this.page = gamePage;
        await this.page.bringToFront();
        console.log('✅ Cambiado a pestaña del juego');
      }

      // Tomar screenshot para debug
      await this.page.screenshot({ path: 'set-logged-in-debug.png' });
      console.log('📸 Screenshot guardado en set-logged-in-debug.png');

      // Verificar URL actual
      const currentUrl = this.page.url();
      console.log(`🔗 URL actual: ${currentUrl}`);

      // Verificar si estamos en el juego con múltiples selectores
      const gameSelectors = [
        '#planetList',
        '#resources',
        '.OGameClock',
        '#ingamepage',
        '#menuTable',
        '.planet-name',
        '.planet-koords',
        '[class*="planet"]',
        '[class*="resource"]',
        '[class*="menu"]',
        'a[href*="page=ingame"]',
        'div[id*="planet"]',
        'div[id*="resource"]',
      ];

      let inGame = false;
      for (const selector of gameSelectors) {
        try {
          const element = this.page.locator(selector).first();
          if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
            console.log(`✅ Elemento del juego encontrado: ${selector}`);
            inGame = true;
            break;
          }
        } catch {
          // Continuar con siguiente selector
        }
      }

      // Verificación adicional por URL (solo URLs de juego, no lobby)
      if (!inGame && currentUrl.includes('ogame.gameforge.com/game')) {
        console.log('✅ URL de juego detectada');
        inGame = true;
      } else if (currentUrl.includes('lobby.ogame.gameforge.com')) {
        console.log('⚠️ Estás en el lobby, no dentro del juego. Por favor selecciona un universo.');
        return false;
      }

      // Verificación adicional por título de página
      if (!inGame) {
        const title = await this.page.title();
        if (title.includes('OGame') && !title.includes('Lobby')) {
          console.log(`✅ Título de juego detectado: ${title}`);
          inGame = true;
        }
      }

      if (inGame) {
        this.isLoggedIn = true;
        console.log('✅ Estado de login establecido manualmente');
        return true;
      } else {
        console.log('⚠️ No se detecta que estés en el juego. Revisa set-logged-in-debug.png');
        return false;
      }
    } catch (error) {
      console.error('❌ Error estableciendo estado de login:', error);
      return false;
    }
  }

  async getResources(): Promise<Resources | null> {
    if (!this.page || !this.isLoggedIn) return null;

    try {
      const metal = await this.extractResource('#resources_metal');
      const crystal = await this.extractResource('#resources_crystal');
      const deuterium = await this.extractResource('#resources_deuterium');
      const energy = await this.extractResource('#resources_energy');

      return { metal, crystal, deuterium, energy };
    } catch (error) {
      console.error('Error obteniendo recursos:', error);
      return null;
    }
  }

  private async extractResource(selector: string): Promise<number> {
    if (!this.page) return 0;
    const text = await this.page.locator(selector).textContent();
    if (!text) return 0;
    return parseInt(text.replace(/\./g, '').replace(/,/g, ''), 10) || 0;
  }

  async navigateTo(page: 'overview' | 'resources' | 'facilities' | 'research' | 'shipyard' | 'fleet' | 'galaxy'): Promise<void> {
    if (!this.page || !this.isLoggedIn) return;

    const menuMap: Record<string, string> = {
      overview: '#menuTable a[href*="page=ingame&component=overview"]',
      resources: '#menuTable a[href*="component=supplies"]',
      facilities: '#menuTable a[href*="component=facilities"]',
      research: '#menuTable a[href*="component=research"]',
      shipyard: '#menuTable a[href*="component=shipyard"]',
      fleet: '#menuTable a[href*="component=fleetdispatch"]',
      galaxy: '#menuTable a[href*="component=galaxy"]',
    };

    const selector = menuMap[page];
    if (selector) {
      await this.page.click(selector);
      await this.page.waitForLoadState('networkidle');
    }
  }

  async getPlanets(): Promise<Planet[]> {
    if (!this.page || !this.isLoggedIn) return [];

    try {
      const planets: Planet[] = [];
      const planetElements = await this.page.locator('#planetList .smallplanet').all();

      for (const element of planetElements) {
        const id = await element.getAttribute('id') || '';
        const name = await element.locator('.planet-name').textContent() || '';
        const coords = await element.locator('.planet-koords').textContent() || '';
        
        planets.push({
          id: id.replace('planet-', ''),
          name: name.trim(),
          coordinates: coords.trim(),
        });
      }

      return planets;
    } catch (error) {
      console.error('Error obteniendo planetas:', error);
      return [];
    }
  }

  getLoginStatus(): boolean {
    return this.isLoggedIn;
  }

  async getStorageInfo(): Promise<{ levels: { metal: number; crystal: number; deuterium: number }; capacities: { metal: number; crystal: number; deuterium: number } } | null> {
    if (!this.page || !this.isLoggedIn) return null;

    try {
      // Asegurarse de estar en la página de supplies
      const currentUrl = this.page.url();
      if (!currentUrl.includes('component=supplies')) {
        await this.navigateTo('resources');
        await this.page.waitForTimeout(2000);
      }

      const levels = {
        metal: 0,
        crystal: 0,
        deuterium: 0,
      };

      // Selectores para obtener el nivel de cada almacén
      const storageSelectors = {
        metal: 'li.metalStorage .level',
        crystal: 'li.crystalStorage .level',
        deuterium: 'li.deuteriumStorage .level',
      };

      for (const [storageType, selector] of Object.entries(storageSelectors)) {
        try {
          const levelElement = this.page.locator(selector).first();
          if (await levelElement.isVisible({ timeout: 2000 }).catch(() => false)) {
            const levelText = await levelElement.textContent() || '0';
            const level = parseInt(levelText.replace(/\D/g, '')) || 0;
            levels[storageType as keyof typeof levels] = level;
          }
        } catch {
          // Ignorar
        }
      }

      // Si no encontramos niveles con .level, intentar con el texto del elemento
      if (levels.metal === 0 && levels.crystal === 0 && levels.deuterium === 0) {
        const altSelectors = {
          metal: 'li.metalStorage',
          crystal: 'li.crystalStorage',
          deuterium: 'li.deuteriumStorage',
        };

        for (const [storageType, selector] of Object.entries(altSelectors)) {
          try {
            const element = this.page.locator(selector).first();
            if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
              const text = await element.textContent() || '';
              const match = text.match(/(\d+)/);
              if (match) {
                const level = parseInt(match[1]);
                if (level >= 0 && level < 50) {
                  levels[storageType as keyof typeof levels] = level;
                }
              }
            }
          } catch {
            // Ignorar
          }
        }
      }

      // Calcular capacidades usando la fórmula de OGame
      // Capacidad = 5000 × floor(2.5 × e^(20 × nivel / 33))
      // Nivel 0 = 10000 (capacidad base)
      const calculateCapacity = (level: number): number => {
        if (level === 0) return 10000;
        return Math.floor(5000 * Math.floor(2.5 * Math.exp(20 * level / 33)));
      };

      const capacities = {
        metal: calculateCapacity(levels.metal),
        crystal: calculateCapacity(levels.crystal),
        deuterium: calculateCapacity(levels.deuterium),
      };

      return { levels, capacities };
    } catch (error) {
      console.error('Error obteniendo información de almacenes:', error);
      return null;
    }
  }

  async screenshot(path: string): Promise<void> {
    if (this.page) {
      await this.page.screenshot({ path });
    }
  }

  private async closePopups(): Promise<void> {
    if (!this.page) return;

    // Lista de selectores comunes para cerrar popups/modales
    // El popup de "Nuevo servidor" tiene una X en la esquina superior derecha
    const closeSelectors = [
      // Selectores específicos del popup de OGame
      'a[href="javascript:;"]',  // La X del popup de nuevo servidor
      '.openX_interstitial a',
      '[class*="interstitial"] a',
      'a.close',
      'a:has-text("x")',
      // Selectores genéricos
      'button.close',
      'button[aria-label="Close"]',
      'button[aria-label="Cerrar"]',
      '.modal-close',
      '.popup-close',
      '.close-button',
      '[class*="close"]',
      'button:has-text("×")',
      'button:has-text("X")',
      'button:has-text("Close")',
      'button:has-text("Cerrar")',
      '.overlay-close',
      '[class*="dismiss"]',
    ];

    for (const selector of closeSelectors) {
      try {
        const closeBtn = this.page.locator(selector).first();
        if (await closeBtn.isVisible({ timeout: 500 }).catch(() => false)) {
          await closeBtn.click();
          console.log(`🔴 Popup cerrado con selector: ${selector}`);
          await this.page.waitForTimeout(500);
        }
      } catch {
        // Continuar con el siguiente selector
      }
    }

    // Buscar específicamente el enlace "x" del popup de nuevo servidor
    try {
      const xLink = this.page.getByRole('link', { name: 'x' });
      if (await xLink.isVisible({ timeout: 1000 }).catch(() => false)) {
        await xLink.click();
        console.log('🔴 Popup de nuevo servidor cerrado (link x)');
        await this.page.waitForTimeout(500);
      }
    } catch {
      // Ignorar
    }

    // También intentar cerrar haciendo click fuera del modal si existe un overlay
    try {
      const overlay = this.page.locator('.modal-backdrop, .overlay, [class*="backdrop"]').first();
      if (await overlay.isVisible({ timeout: 300 }).catch(() => false)) {
        await overlay.click({ position: { x: 10, y: 10 } });
        console.log('🔴 Overlay clickeado para cerrar popup');
      }
    } catch {
      // Ignorar
    }

    // Presionar Escape como último recurso
    try {
      await this.page.keyboard.press('Escape');
    } catch {
      // Ignorar
    }
  }
}

export const ogameClient = new OGameClient();
