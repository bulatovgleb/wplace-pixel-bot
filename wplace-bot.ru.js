// wplace-bot.ru.js
// ===============================================
// WPlace Бот (локализованный, самодостаточный)
// Автор: выложено пользователем для собственного GitHub
// Назначение: автоматическая простановка пикселей на wplace.live
// ===============================================

(function () {
  'use strict';

  class WPlaceBot {
    constructor() {
      this.isRunning = false;
      this.delay = 1000; // задержка между кликами (мс)
      this.currentPixel = 0;
      this.pixels = [];
      this.startX = 0;
      this.startY = 0;
      this.canvas = null;
      this.colorPalette = [];
      this.selectedColor = '#000000';
    }

    // Инициализация
    init() {
      console.log('🎨 WPlace Бот инициализирован!');
      this.findCanvas();
      this.findColorPalette();
      this.createControlPanel();
      console.log('✅ WPlace Бот Загружен!');
      console.log(`
Команды:
- wplaceBot.setStartPosition(x, y)  — задать начальную позицию
- wplaceBot.setDelay(ms)            — задать задержку (мс)
- wplaceBot.loadHeartImage()        — загрузить сердечко 7×7
- wplaceBot.loadSmileyImage()       — загрузить смайлик 7×7
- wplaceBot.loadImageFromData(arr)  — загрузить массив пикселей
- wplaceBot.loadImageFromUrl(url, maxW, maxH) — загрузить картинку из URL/data URL
- wplaceBot.start()                 — старт рисования
- wplaceBot.stop()                  — стоп
      `);
    }

    // Поиск canvas
    findCanvas() {
      const possibleSelectors = [
        'canvas',
        '#canvas',
        '.canvas',
        '[data-testid="canvas"]',
        'canvas[width]',
        'canvas[height]'
      ];

      for (const selector of possibleSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          this.canvas = element;
          console.log('✅ Canvas найден:', selector);
          return;
        }
      }
      console.error('❌ Canvas не найден. Убедитесь, что вы на странице wplace.live');
    }

    // Поиск палитры цветов (из DOM)
    findColorPalette() {
      const colorElements = document.querySelectorAll(
        '[style*="background-color"], .color, [data-color], .palette-color'
      );

      this.colorPalette = [];
      colorElements.forEach(element => {
        const bgColor = window.getComputedStyle(element).backgroundColor;
        if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)') {
          this.colorPalette.push({ element, color: bgColor });
        }
      });

      console.log(`✅ Найдено цветов в палитре: ${this.colorPalette.length}`);
    }

    // HEX -> RGB объект
    hexToRgb(hex) {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : null;
    }

    // "rgb(…)" -> объект
    rgbStringToObject(rgb) {
      const result = rgb.match(/\d+/g);
      if (!result || result.length < 3) return null;
      return {
        r: parseInt(result[0]),
        g: parseInt(result[1]),
        b: parseInt(result[2])
      };
    }

    // Поиск ближайшего цвета в палитре
    findClosestColor(targetColor) {
      if (this.colorPalette.length === 0) return null;

      let closestColor = this.colorPalette[0];
      let minDistance = Infinity;

      const target = this.hexToRgb(targetColor);
      if (!target) return closestColor;

      this.colorPalette.forEach(paletteColor => {
        const rgb = this.rgbStringToObject(paletteColor.color);
        if (rgb) {
          const distance = Math.sqrt(
            Math.pow(target.r - rgb.r, 2) +
            Math.pow(target.g - rgb.g, 2) +
            Math.pow(target.b - rgb.b, 2)
          );
          if (distance < minDistance) {
            minDistance = distance;
            closestColor = paletteColor;
          }
        }
      });

      return closestColor;
    }

    // Выбор цвета (клик по элементу палитры)
    selectColor(color) {
      const closestColor = this.findClosestColor(color);
      if (closestColor && closestColor.element) {
        closestColor.element.click();
        this.selectedColor = color;
        console.log(`🎨 Выбран цвет: ${color}`);
        return true;
      }
      console.warn('⚠️ Не удалось выбрать цвет', color, '(палитра пуста или не найдена).');
      return false;
    }

    // Клик по canvas в координаты (в пикселях окна)
    clickCanvas(x, y) {
      if (!this.canvas) return false;

      const rect = this.canvas.getBoundingClientRect();
      const canvasX = x + rect.left;
      const canvasY = y + rect.top;

      ['mousedown', 'mouseup', 'click', 'pointerdown', 'pointerup'].forEach(type => {
        const ev = new MouseEvent(type, {
          bubbles: true,
          cancelable: true,
          clientX: canvasX,
          clientY: canvasY,
          button: 0
        });
        this.canvas.dispatchEvent(ev);
      });

      console.log(`🖱️ Клик по canvas: (${x}, ${y})`);
      return true;
    }

    // Загрузка простого изображения (матрица цветов)
    loadSimpleImage(imageData, width, height) {
      this.pixels = [];
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const index = y * width + x;
          if (index < imageData.length) {
            this.pixels.push({ x, y, color: imageData[index] });
          }
        }
      }
      console.log(`📷 Картинка загружена: ${width}×${height} (${this.pixels.length} пикселей)`);
    }

    // Пресет: сердечко 7×7
    loadHeartImage() {
      const heart = [
        '⬜','🟥','🟥','⬜','🟥','🟥','⬜',
        '🟥','🟥','🟥','🟥','🟥','🟥','🟥',
        '🟥','🟥','🟥','🟥','🟥','🟥','🟥',
        '🟥','🟥','🟥','🟥','🟥','🟥','🟥',
        '⬜','🟥','🟥','🟥','🟥','🟥','⬜',
        '⬜','⬜','🟥','🟥','🟥','⬜','⬜',
        '⬜','⬜','⬜','🟥','⬜','⬜','⬜'
      ];
      const colorMap = { '🟥':'#FF0000', '⬜':'#FFFFFF' };
      const imageData = heart.map(e => colorMap[e] || '#FFFFFF');
      this.loadSimpleImage(imageData, 7, 7);
    }

    // Пресет: смайл 7×7
    loadSmileyImage() {
      const smiley = [
        '⬜','⬜','🟨','🟨','🟨','⬜','⬜',
        '⬜','🟨','🟨','🟨','🟨','🟨','⬜',
        '🟨','🟨','⬛','🟨','⬛','🟨','🟨',
        '🟨','🟨','🟨','🟨','🟨','🟨','🟨',
        '🟨','⬛','🟨','🟨','🟨','⬛','🟨',
        '⬜','🟨','⬛','⬛','⬛','🟨','⬜',
        '⬜','⬜','🟨','🟨','🟨','⬜','⬜'
      ];
      const colorMap = { '🟨':'#FFFF00', '⬛':'#000000', '⬜':'#FFFFFF' };
      const imageData = smiley.map(e => colorMap[e] || '#FFFFFF');
      this.loadSimpleImage(imageData, 7, 7);
    }

    // Старт
    async start() {
      if (this.isRunning) { console.log('⚠️ Бот уже запущен.'); return; }
      if (this.pixels.length === 0) { console.log('⚠️ Сначала загрузите картинку.'); return; }

      this.isRunning = true;
      this.currentPixel = 0;
      console.log('🚀 Старт рисования…');

      while (this.isRunning && this.currentPixel < this.pixels.length) {
        const pixel = this.pixels[this.currentPixel];
        const x = this.startX + pixel.x;
        const y = this.startY + pixel.y;

        if (this.selectColor(pixel.color)) {
          await this.sleep(200);
          this.clickCanvas(x, y);
          console.log(`✅ Пиксель ${this.currentPixel + 1}/${this.pixels.length} → (${x}, ${y})`);
        }

        this.currentPixel++;
        await this.sleep(this.delay);
      }

      this.isRunning = false;
      console.log('✅ Рисование завершено.');
    }

    // Стоп
    stop() {
      this.isRunning = false;
      console.log('⏹️ Бот остановлен.');
    }

    // Пауза
    sleep(ms) {
      return new Promise(res => setTimeout(res, ms));
    }

    // Позиция старта
    setStartPosition(x, y) {
      this.startX = x|0;
      this.startY = y|0;
      console.log(`📍 Начальная позиция: (${this.startX}, ${this.startY})`);
    }

    // Задержка
    setDelay(ms) {
      this.delay = Math.max(0, ms|0);
      console.log(`⏱️ Задержка: ${this.delay} мс`);
    }

    // Загрузка массива пикселей
    loadImageFromData(pixelData, name = 'Пользовательская картинка') {
      if (!Array.isArray(pixelData)) {
        console.error('❌ Данные картинки должны быть массивом объектов {x, y, color}');
        return false;
      }
      const isValid = pixelData.every(p =>
        p && typeof p.x === 'number' && typeof p.y === 'number' && typeof p.color === 'string'
      );
      if (!isValid) {
        console.error('❌ Неверный формат. Каждый пиксель должен быть {x, y, color}');
        return false;
      }

      this.pixels = pixelData.slice();
      console.log(`✅ ${name} загружена: ${pixelData.length} пикселей`);

      const maxX = Math.max(...pixelData.map(p => p.x), 0);
      const maxY = Math.max(...pixelData.map(p => p.y), 0);
      console.log(`📐 Размер: ${maxX + 1}×${maxY + 1}`);

      const uniqueColors = [...new Set(pixelData.map(p => p.color))];
      console.log(`🎨 Уникальных цветов: ${uniqueColors.length}`);
      return true;
    }

    // Загрузка из URL/dataURL
    async loadImageFromUrl(imageUrl, maxWidth = 50, maxHeight = 50) {
      try {
        console.log('🔄 Загрузка изображения из URL…');
        const img = new Image();
        img.crossOrigin = 'anonymous';

        return new Promise((resolve, reject) => {
          img.onload = () => {
            try {
              const pixelData = this.processImageToPixels(img, maxWidth, maxHeight);
              this.loadImageFromData(pixelData, 'Изображение из URL');
              resolve(true);
            } catch (e) { reject(e); }
          };
          img.onerror = () => reject(new Error('Ошибка загрузки изображения по URL'));
          img.src = imageUrl;
        });
      } catch (err) {
        console.error('❌ Ошибка при загрузке изображения:', err);
        return false;
      }
    }

    // Подготовка пикселей из HTMLImageElement
    processImageToPixels(img, maxWidth, maxHeight) {
      const scale = Math.min(maxWidth / img.width, maxHeight / img.height);
      const width = Math.max(1, Math.floor(img.width * scale));
      const height = Math.max(1, Math.floor(img.height * scale));

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = width;
      canvas.height = height;

      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, width, height);

      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;

      const pixels = [];
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const a = data[idx + 3];

          if (a < 128) continue; // прозрачные пропускаем

          const color = '#' + [r, g, b].map(v => {
            const h = v.toString(16);
            return h.length === 1 ? '0' + h : h;
          }).join('');

          pixels.push({ x, y, color });
        }
      }
      return pixels;
    }

    // Панель управления (на русском)
    createControlPanel() {
      const existing = document.getElementById('wplace-bot-panel');
      if (existing) existing.remove();

      const panel = document.createElement('div');
      panel.id = 'wplace-bot-panel';
      panel.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: #2c2c2c;
        color: #fff;
        padding: 15px;
        border-radius: 10px;
        font-family: Arial, sans-serif;
        font-size: 12px;
        z-index: 10000;
        width: 250px;
        box-shadow: 0 4px 8px rgba(0,0,0,.3);
      `;

      panel.innerHTML = `
        <h3 style="margin:0 0 10px 0; color:#4CAF50;">🎨 WPlace Бот</h3>

        <div style="margin-bottom:10px; display:flex; justify-content:space-between;">
          <label>Позиция X: <input type="number" id="startX" value="100" style="width:66px;"></label>
          <label>Позиция Y: <input type="number" id="startY" value="100" style="width:66px;"></label>
        </div>

        <div style="margin-bottom:10px;">
          <label>Задержка (мс): <input type="number" id="delay" value="1000" style="width:90px;"></label>
        </div>

        <div style="margin-bottom:10px;">
          <button id="loadHeart" style="margin-right:5px; margin-bottom:5px;">❤️ Сердце</button>
          <button id="loadSmiley" style="margin-bottom:5px;">😊 Смайлик</button>
        </div>

        <div style="margin-bottom:10px;">
          <input type="file" id="imageInput" accept="image/*" style="display:none;">
          <button id="loadCustom" style="background:#FF9800;color:#fff;border:none;padding:6px 10px;border-radius:4px;margin-right:5px;margin-bottom:5px;font-size:11px;">📁 Загрузить</button>
          <button id="openConverter" style="background:#9C27B0;color:#fff;border:none;padding:6px 10px;border-radius:4px;margin-right:5px;margin-bottom:5px;font-size:11px;">🔧 Конвертер</button>
          <button id="openEditor" style="background:#E91E63;color:#fff;border:none;padding:6px 10px;border-radius:4px;margin-bottom:5px;font-size:11px;">🎨 Редактор</button>
        </div>

        <div style="margin-bottom:10px;">
          <button id="startBot" style="background:#4CAF50;color:#fff;border:none;padding:8px 12px;border-radius:4px;margin-right:5px;">▶️ Запуск</button>
          <button id="stopBot" style="background:#f44336;color:#fff;border:none;padding:8px 12px;border-radius:4px;">⏹️ Стоп</button>
        </div>

        <div id="status" style="font-size:11px;color:#ccc;">Статус: Готов</div>
      `;

      document.body.appendChild(panel);

      // Слушатели
      panel.querySelector('#startX').addEventListener('input', e => {
        this.setStartPosition(parseInt(e.target.value) || 0, this.startY);
      });
      panel.querySelector('#startY').addEventListener('input', e => {
        this.setStartPosition(this.startX, parseInt(e.target.value) || 0);
      });
      panel.querySelector('#delay').addEventListener('input', e => {
        this.setDelay(parseInt(e.target.value) || 1000);
      });

      panel.querySelector('#loadHeart').addEventListener('click', () => {
        this.loadHeartImage();
        panel.querySelector('#status').textContent = 'Статус: Сердце загружено';
      });
      panel.querySelector('#loadSmiley').addEventListener('click', () => {
        this.loadSmileyImage();
        panel.querySelector('#status').textContent = 'Статус: Смайлик загружен';
      });

      panel.querySelector('#startBot').addEventListener('click', () => {
        this.start();
        panel.querySelector('#status').textContent = 'Статус: Выполняется…';
      });
      panel.querySelector('#stopBot').addEventListener('click', () => {
        this.stop();
        panel.querySelector('#status').textContent = 'Статус: Остановлен';
      });

      panel.querySelector('#loadCustom').addEventListener('click', () => {
        panel.querySelector('#imageInput').click();
      });

      panel.querySelector('#imageInput').addEventListener('change', async (e) => {
        if (e.target.files.length > 0) {
          const file = e.target.files[0];
          try {
            panel.querySelector('#status').textContent = 'Статус: Загрузка изображения…';
            const reader = new FileReader();
            reader.onload = async (ev) => {
              try {
                await this.loadImageFromUrl(ev.target.result, 50, 50);
                panel.querySelector('#status').textContent = 'Статус: Изображение загружено!';
              } catch (error) {
                console.error('Ошибка обработки изображения:', error);
                panel.querySelector('#status').textContent = 'Статус: Ошибка при загрузке';
              }
            };
            reader.readAsDataURL(file);
          } catch (error) {
            console.error('Ошибка чтения файла:', error);
            panel.querySelector('#status').textContent = 'Статус: Ошибка чтения файла';
          }
        }
      });

      panel.querySelector('#openConverter').addEventListener('click', () => {
        const path = window.location.origin + window.location.pathname.replace(/[^/]*$/, '') + 'image-converter.html';
        window.open(path, '_blank');
      });

      panel.querySelector('#openEditor').addEventListener('click', () => {
        const path = window.location.origin + window.location.pathname.replace(/[^/]*$/, '') + 'pixel-editor.html';
        window.open(path, '_blank');
      });
    }
  }

  // === Экспорт экземпляра ===
  // Пытаемся создать/найти экземпляр в текущем окне
  const g = window || globalThis;
  if (typeof g.wplaceBot === 'undefined') {
    g.wplaceBot = new WPlaceBot();
    g.wplaceBot.init();
  }

  // Если бот вдруг живет во фрейме — найдём и «вытянем» наружу
  (function exportFromFrames() {
    try {
      if (g.wplaceBot) return; // уже есть
      let found = null;
      (function scan(win) {
        try {
          if (win.wplaceBot) { found = win.wplaceBot; return; }
          if (win.WPlaceBot) {
            win.wplaceBot = new win.WPlaceBot();
            win.wplaceBot.init();
            found = win.wplaceBot; return;
          }
          for (let i = 0; i < win.frames.length; i++) {
            scan(win.frames[i]);
            if (found) return;
          }
        } catch (_) {}
      })(g);
      if (found) {
        g.wplaceBot = found;
        console.log('🔗 Экземпляр wplaceBot доступен в верхнем окне.');
      }
    } catch (_) {}
  })();

})();
