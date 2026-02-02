import { ogameClient } from '../browser/ogame-client.js';
import { MineLevels, StorageLevels } from '../game/ogame-formulas.js';

export async function getMineLevels(): Promise<MineLevels | null> {
  if (!ogameClient.page) return null;

  try {
    console.log('\n🔍 Obteniendo niveles de las minas...');

    // Asegurarse de estar en la página de supplies
    const currentUrl = ogameClient.page.url();
    if (!currentUrl.includes('component=supplies')) {
      await ogameClient.navigateTo('resources');
      await ogameClient.page.waitForTimeout(2000);
    }

    const levels: MineLevels = {
      metal: 0,
      crystal: 0,
      deuterium: 0,
      solar: 0,
      solarSatellites: 0,
    };

    // Selectores para obtener el nivel de cada mina
    const mineSelectors = {
      metal: 'li.metalMine .level',
      crystal: 'li.crystalMine .level',
      deuterium: 'li.deuteriumSynthesizer .level',
      solar: 'li.solarPlant .level',
    };

    for (const [mineType, selector] of Object.entries(mineSelectors)) {
      try {
        const levelElement = ogameClient.page.locator(selector).first();
        if (await levelElement.isVisible({ timeout: 2000 }).catch(() => false)) {
          const levelText = await levelElement.textContent() || '0';
          const level = parseInt(levelText.replace(/\D/g, '')) || 0;
          levels[mineType as keyof MineLevels] = level;
          console.log(`   - ${mineType}: nivel ${level}`);
        }
      } catch {
        console.log(`   - ${mineType}: no encontrado, asumiendo nivel 0`);
      }
    }

    // Si no encontramos niveles con el selector .level, intentar con data-value
    if (levels.metal === 0 && levels.crystal === 0) {
      console.log('🔍 Intentando obtener niveles con selector alternativo...');
      
      const altSelectors = {
        metal: 'li.metalMine [data-value]',
        crystal: 'li.crystalMine [data-value]',
        deuterium: 'li.deuteriumSynthesizer [data-value]',
        solar: 'li.solarPlant [data-value]',
      };

      for (const [mineType, selector] of Object.entries(altSelectors)) {
        try {
          const element = ogameClient.page.locator(selector).first();
          if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
            const value = await element.getAttribute('data-value') || '0';
            const level = parseInt(value) || 0;
            if (level > 0) {
              levels[mineType as keyof MineLevels] = level;
              console.log(`   - ${mineType}: nivel ${level} (alt)`);
            }
          }
        } catch {
          // Ignorar
        }
      }
    }

    // Si aún no tenemos niveles, intentar extraerlos del texto visible
    if (levels.metal === 0 && levels.crystal === 0) {
      console.log('🔍 Intentando obtener niveles del texto visible...');
      
      const mineElements = {
        metal: 'li.metalMine',
        crystal: 'li.crystalMine',
        deuterium: 'li.deuteriumSynthesizer',
        solar: 'li.solarPlant',
      };

      for (const [mineType, selector] of Object.entries(mineElements)) {
        try {
          const element = ogameClient.page.locator(selector).first();
          if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
            const text = await element.textContent() || '';
            const match = text.match(/(\d+)/);
            if (match) {
              const level = parseInt(match[1]);
              if (level > 0 && level < 100) {
                levels[mineType as keyof MineLevels] = level;
                console.log(`   - ${mineType}: nivel ${level} (texto)`);
              }
            }
          }
        } catch {
          // Ignorar
        }
      }
    }

    // Obtener cantidad de satélites solares
    levels.solarSatellites = await getSolarSatelliteCount();
    console.log(`   - solarSatellites: ${levels.solarSatellites}`);

    return levels;
  } catch (error) {
    console.error('❌ Error obteniendo niveles de minas:', error);
    return null;
  }
}

async function getSolarSatelliteCount(): Promise<number> {
  if (!ogameClient.page) return 0;

  try {
    const currentUrl = ogameClient.page.url();
    if (!currentUrl.includes('component=resourcesettings')) {
      await ogameClient.page.goto(currentUrl.split('?')[0] + '?page=ingame&component=resourcesettings');
      await ogameClient.page.waitForLoadState('networkidle');
      await ogameClient.page.waitForTimeout(1000);
    }

    const satelliteRow = ogameClient.page.locator('tr:has-text("Satélite solar"), tr:has-text("Solar Satellite")').first();
    
    if (await satelliteRow.isVisible({ timeout: 3000 }).catch(() => false)) {
      const rowText = await satelliteRow.textContent() || '';
      const quantityMatch = rowText.match(/Cantidad:\s*(\d+)/i) || rowText.match(/\((\d+)\)/);
      if (quantityMatch) {
        return parseInt(quantityMatch[1]) || 0;
      }
    }

    return 0;
  } catch {
    return 0;
  }
}

export async function getStorageLevels(): Promise<StorageLevels | null> {
  if (!ogameClient.page) return null;

  try {
    console.log('\n🔍 Obteniendo niveles de los almacenes...');

    const currentUrl = ogameClient.page.url();
    if (!currentUrl.includes('component=supplies')) {
      await ogameClient.navigateTo('resources');
      await ogameClient.page.waitForTimeout(2000);
    }

    const levels: StorageLevels = {
      metal: 0,
      crystal: 0,
      deuterium: 0,
    };

    const storageSelectors = {
      metal: 'li.metalStorage .level',
      crystal: 'li.crystalStorage .level',
      deuterium: 'li.deuteriumStorage .level',
    };

    for (const [storageType, selector] of Object.entries(storageSelectors)) {
      try {
        const levelElement = ogameClient.page.locator(selector).first();
        if (await levelElement.isVisible({ timeout: 2000 }).catch(() => false)) {
          const levelText = await levelElement.textContent() || '0';
          const level = parseInt(levelText.replace(/\D/g, '')) || 0;
          levels[storageType as keyof StorageLevels] = level;
          console.log(`   - ${storageType}: nivel ${level}`);
        }
      } catch {
        console.log(`   - ${storageType}: no encontrado, asumiendo nivel 0`);
      }
    }

    // Intentar con selector alternativo si no encontramos niveles
    if (levels.metal === 0 && levels.crystal === 0 && levels.deuterium === 0) {
      console.log('🔍 Intentando obtener niveles de almacenes con selector alternativo...');
      
      const storageElements = {
        metal: 'li.metalStorage',
        crystal: 'li.crystalStorage',
        deuterium: 'li.deuteriumStorage',
      };

      for (const [storageType, selector] of Object.entries(storageElements)) {
        try {
          const element = ogameClient.page.locator(selector).first();
          if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
            const text = await element.textContent() || '';
            const match = text.match(/(\d+)/);
            if (match) {
              const level = parseInt(match[1]);
              if (level >= 0 && level < 50) {
                levels[storageType as keyof StorageLevels] = level;
                console.log(`   - ${storageType}: nivel ${level} (texto)`);
              }
            }
          }
        } catch {
          // Ignorar
        }
      }
    }

    return levels;
  } catch (error) {
    console.error('❌ Error obteniendo niveles de almacenes:', error);
    return null;
  }
}

export async function buildMine(mineType: string): Promise<boolean> {
  if (!ogameClient.page) return false;

  try {
    console.log(`🏗️ Intentando construir/mejorar ${mineType}...`);

    const currentUrl = ogameClient.page.url();
    if (!currentUrl.includes('component=supplies')) {
      console.log('🔍 Navegando a página de recursos...');
      await ogameClient.navigateTo('resources');
      await ogameClient.page.waitForTimeout(3000);
    }

    const mineSelectors: Record<string, string> = {
      metal: 'li.metalMine',
      crystal: 'li.crystalMine',
      deuterium: 'li.deuteriumSynthesizer',
      energy: 'li.solarPlant',
      solar: 'li.solarPlant',
    };

    const selector = mineSelectors[mineType];
    if (!selector) {
      console.log(`❌ Tipo de mina desconocido: ${mineType}`);
      return false;
    }

    const mineElement = ogameClient.page.locator(selector).first();
    
    if (await mineElement.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log(`🎯 Haciendo click en ${mineType} para ver detalles...`);
      await mineElement.click();
      await ogameClient.page.waitForTimeout(2000);
      
      // Esperar panel de detalles
      const detailsPanelSelectors = [
        '#technologydetails',
        '.detail_content',
        '.technology_detail',
        '[id*="details"]',
      ];
      
      let panelFound = false;
      for (const panelSelector of detailsPanelSelectors) {
        const panel = ogameClient.page.locator(panelSelector).first();
        if (await panel.isVisible({ timeout: 2000 }).catch(() => false)) {
          console.log(`✅ Panel de detalles encontrado: ${panelSelector}`);
          panelFound = true;
          break;
        }
      }
      
      if (!panelFound) {
        console.log('⚠️ Panel de detalles no encontrado, intentando click de nuevo...');
        await mineElement.click();
        await ogameClient.page.waitForTimeout(3000);
      }
      
      await ogameClient.page.screenshot({ path: `build-${mineType}-details.png` });
      
      // Buscar botón Mejorar
      const upgradeButtonSelectors = [
        'button.upgrade:has-text("Mejorar")',
        'button:has-text("Mejorar")',
        'a.upgrade:has-text("Mejorar")',
        'a:has-text("Mejorar")',
        '.upgrade button',
        '.build-it_wrap button',
        '.build-it_wrap a',
        'button.upgrade',
        'a.upgrade',
        '[class*="upgrade"]:has-text("Mejorar")',
        '[class*="upgrade"]:has-text("Upgrade")',
      ];

      console.log('🔍 Buscando botón Mejorar...');

      for (const btnSelector of upgradeButtonSelectors) {
        const button = ogameClient.page.locator(btnSelector).first();
        
        if (await button.isVisible({ timeout: 2000 }).catch(() => false)) {
          const buttonText = await button.textContent() || '';
          const buttonClass = await button.getAttribute('class') || '';
          console.log(`🔍 Botón encontrado: selector="${btnSelector}", texto="${buttonText}", clase="${buttonClass}"`);
          
          const isDisabled = await button.getAttribute('disabled') !== null ||
                            buttonClass.includes('disabled') ||
                            buttonClass.includes('off');
          
          if (!isDisabled) {
            console.log(`✅ Botón habilitado, haciendo click...`);
            await button.click();
            console.log(`🏗️ ¡Click en Mejorar ${mineType}!`);
            await ogameClient.page.waitForTimeout(2000);
            
            await ogameClient.page.screenshot({ path: `build-${mineType}-after.png` });
            
            return true;
          } else {
            console.log(`⚠️ Botón está deshabilitado (clase: ${buttonClass})`);
          }
        }
      }

      // Buscar cualquier botón verde visible
      console.log('🔍 Buscando cualquier botón verde visible...');
      const allButtons = await ogameClient.page.locator('button, a.button, a[role="button"]').all();
      
      for (const button of allButtons) {
        const text = await button.textContent() || '';
        const isVisible = await button.isVisible().catch(() => false);
        
        if (isVisible && (text.includes('Mejorar') || text.includes('Upgrade') || text.includes('Build'))) {
          console.log(`🔍 Botón alternativo encontrado: "${text}"`);
          await button.click();
          console.log(`🏗️ ¡Click en botón alternativo para ${mineType}!`);
          await ogameClient.page.waitForTimeout(2000);
          await ogameClient.page.screenshot({ path: `build-${mineType}-after.png` });
          return true;
        }
      }

      console.log(`❌ No se encontró botón de Mejorar para ${mineType}`);
      return false;
    } else {
      console.log(`❌ No se encontró elemento para ${mineType}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error construyendo mina de ${mineType}:`, error);
    return false;
  }
}

export async function buildStorage(storageType: 'metal' | 'crystal' | 'deuterium'): Promise<boolean> {
  if (!ogameClient.page) return false;

  try {
    console.log(`🏗️ Intentando construir almacén de ${storageType}...`);

    const currentUrl = ogameClient.page.url();
    if (!currentUrl.includes('component=supplies')) {
      console.log('🔍 Navegando a página de recursos...');
      await ogameClient.navigateTo('resources');
      await ogameClient.page.waitForTimeout(3000);
    }

    const storageSelectors: Record<string, string> = {
      metal: 'li.metalStorage',
      crystal: 'li.crystalStorage',
      deuterium: 'li.deuteriumStorage',
    };

    const selector = storageSelectors[storageType];
    if (!selector) {
      console.log(`❌ Tipo de almacén desconocido: ${storageType}`);
      return false;
    }

    const storageElement = ogameClient.page.locator(selector).first();
    
    if (await storageElement.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log(`🎯 Haciendo click en almacén de ${storageType} para ver detalles...`);
      await storageElement.click();
      await ogameClient.page.waitForTimeout(2000);
      
      // Esperar panel de detalles
      const detailsPanelSelectors = [
        '#technologydetails',
        '.detail_content',
        '.technology_detail',
        '[id*="details"]',
      ];
      
      let panelFound = false;
      for (const panelSelector of detailsPanelSelectors) {
        const panel = ogameClient.page.locator(panelSelector).first();
        if (await panel.isVisible({ timeout: 2000 }).catch(() => false)) {
          console.log(`✅ Panel de detalles encontrado: ${panelSelector}`);
          panelFound = true;
          break;
        }
      }

      if (!panelFound) {
        console.log('⚠️ Panel de detalles no encontrado, intentando click de nuevo...');
        await storageElement.click();
        await ogameClient.page.waitForTimeout(3000);
      }

      await ogameClient.page.screenshot({ path: `build-storage-${storageType}-details.png` });

      // Buscar botón Mejorar
      const upgradeButtonSelectors = [
        'button.upgrade',
        'a.upgrade',
        'button:has-text("Mejorar")',
        'a:has-text("Mejorar")',
        'button:has-text("Upgrade")',
        'a:has-text("Upgrade")',
        '.upgrade_building',
        '[class*="upgrade"]',
      ];

      for (const buttonSelector of upgradeButtonSelectors) {
        const button = ogameClient.page.locator(buttonSelector).first();
        
        if (await button.isVisible({ timeout: 2000 }).catch(() => false)) {
          const buttonText = await button.textContent() || '';
          const buttonClass = await button.getAttribute('class') || '';
          console.log(`🔍 Botón encontrado: "${buttonText.trim()}" (clase: ${buttonClass})`);
          
          const isDisabled = await button.getAttribute('disabled') !== null ||
                            buttonClass.includes('disabled') ||
                            buttonClass.includes('off');
          
          if (!isDisabled) {
            console.log(`✅ Botón habilitado, haciendo click...`);
            await button.click();
            console.log(`🏗️ ¡Click en Mejorar almacén de ${storageType}!`);
            await ogameClient.page.waitForTimeout(2000);
            
            await ogameClient.page.screenshot({ path: `build-storage-${storageType}-after.png` });
            
            return true;
          } else {
            console.log(`⚠️ Botón está deshabilitado (clase: ${buttonClass})`);
          }
        }
      }

      console.log(`❌ No se encontró botón de Mejorar para almacén de ${storageType}`);
      return false;
    } else {
      console.log(`❌ No se encontró elemento para almacén de ${storageType}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error construyendo almacén de ${storageType}:`, error);
    return false;
  }
}

export async function checkIfSomethingInProduction(): Promise<{ inProduction: boolean; remainingSeconds: number }> {
  if (!ogameClient.page) return { inProduction: false, remainingSeconds: 0 };

  try {
    // Buscar el texto "No hay edificios en construcción" o similar
    const noConstructionSelectors = [
      'text=No hay edificios en construcción',
      'text=No buildings in construction',
      '.construction_icon.idle',
      '.idle',
    ];

    for (const selector of noConstructionSelectors) {
      try {
        const element = ogameClient.page.locator(selector).first();
        if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
          console.log('✅ No hay construcción en curso');
          return { inProduction: false, remainingSeconds: 0 };
        }
      } catch {
        // Continuar
      }
    }

    // Buscar temporizador de construcción
    const timerSelectors = [
      '.construction .timer',
      '.buildingCountdown',
      '[id*="countdown"]',
      '.countdown',
      '.timer',
    ];

    for (const selector of timerSelectors) {
      try {
        const timerElement = ogameClient.page.locator(selector).first();
        if (await timerElement.isVisible({ timeout: 1000 }).catch(() => false)) {
          const timerText = await timerElement.textContent() || '';
          console.log(`⏱️ Temporizador encontrado: ${timerText}`);
          
          const seconds = parseDurationToSeconds(timerText);
          if (seconds > 0) {
            console.log(`⏳ Construcción en curso, faltan ${seconds} segundos`);
            return { inProduction: true, remainingSeconds: seconds };
          }
        }
      } catch {
        // Continuar
      }
    }

    // Si no encontramos nada, asumir que no hay construcción
    return { inProduction: false, remainingSeconds: 0 };
  } catch (error) {
    console.error('❌ Error verificando producción:', error);
    return { inProduction: false, remainingSeconds: 0 };
  }
}

function parseDurationToSeconds(durationText: string): number {
  let totalSeconds = 0;
  
  // Extraer horas
  const hoursMatch = durationText.match(/(\d+)\s*h/i);
  if (hoursMatch) {
    totalSeconds += parseInt(hoursMatch[1]) * 3600;
  }
  
  // Extraer minutos
  const minutesMatch = durationText.match(/(\d+)\s*m/i);
  if (minutesMatch) {
    totalSeconds += parseInt(minutesMatch[1]) * 60;
  }
  
  // Extraer segundos
  const secondsMatch = durationText.match(/(\d+)\s*s/i);
  if (secondsMatch) {
    totalSeconds += parseInt(secondsMatch[1]);
  }
  
  return totalSeconds;
}
