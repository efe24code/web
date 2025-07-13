const canvas = document.getElementById('pixelCanvas');
const ctx = canvas.getContext('2d');

const paletteColors = document.querySelectorAll('.color-box');
const customColorPicker = document.getElementById('customColorPicker');
const pencilTool = document.getElementById('pencilTool');
const eraserTool = document.getElementById('eraserTool');
const fillTool = document.getElementById('fillTool');
const clearCanvasBtn = document.getElementById('clearCanvas');
const downloadImageBtn = document.getElementById('downloadImage');

// Yakınlaştırma kontrolleri
const zoomInBtn = document.getElementById('zoomIn');
const zoomOutBtn = document.getElementById('zoomOut');
const zoomLevelSpan = document.getElementById('zoomLevel');

const PIXEL_SIZE = 1; // Her bir "pikselin" canvas üzerinde kapladığı gerçek piksel
const CANVAS_WIDTH = 128; // Piksel artımızın gerçek piksel genişliği
const CANVAS_HEIGHT = 128; // Piksel artımızın gerçek piksel yüksekliği

let currentColor = '#000000'; // Varsayılan renk siyah
let drawing = false; // Çizim yapılıyor mu?
let currentTool = 'pencil'; // Varsayılan araç: kalem

let currentZoom = 4; // Başlangıç yakınlaştırma seviyesi (4x büyütme)
const MIN_ZOOM = 1;
const MAX_ZOOM = 8;

// --- Canvas Boyutunu ve Çözünürlüğünü Ayarlama ---
// Canvasın çizim çözünürlüğü (128x128) ile görüntülenecek boyutu (örn. 512x512) ayrı tutuyoruz.
// context.scale() kullanarak pikselleri büyütmek yerine,
// canvas elementinin stil genişliğini ve yüksekliğini ayarlıyoruz.
// Bu, canvas içeriğini bulanıklaştırmadan pikselli görünümünü korur.
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

function applyZoom() {
    canvas.style.width = `${CANVAS_WIDTH * currentZoom}px`;
    canvas.style.height = `${CANVAS_HEIGHT * currentZoom}px`;
    zoomLevelSpan.textContent = `${currentZoom * 100}%`;
}

// --- Tuvali Beyaz Renkle Başlat ---
function initializeCanvas() {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT); // Çözünürlük canvas'ında doldur
    applyZoom(); // Yakınlaştırmayı uygula
}
initializeCanvas();

// --- Renk Seçimi ---
paletteColors.forEach(box => {
    box.style.backgroundColor = box.dataset.color; // CSS ile de tanımlı ama JS ile de set edelim
    box.addEventListener('click', () => {
        selectColor(box.dataset.color);
        // Önceki seçili rengi kaldır
        document.querySelector('.color-box.selected')?.classList.remove('selected');
        // Yeni seçili rengi ata
        box.classList.add('selected');
        // Custom renk seçiciyi de güncelle
        customColorPicker.value = box.dataset.color;
    });
});

// Özel renk seçici olay dinleyicisi
customColorPicker.addEventListener('input', (event) => {
    selectColor(event.target.value);
    // Önceden seçili palet kutusunu kaldır (eğer seçiliyse)
    document.querySelector('.color-box.selected')?.classList.remove('selected');
});

// Özel renk seçici değiştiğinde de otomatik olarak seçili hale gelsin
customColorPicker.addEventListener('change', (event) => {
    // Input tipi color'ın value'su zaten #RRGGBB formatındadır.
    // Başka bir işlem yapmaya gerek yok, input olayı zaten rengi seçmişti.
});


function selectColor(color) {
    currentColor = color;
}

// --- Araç Seçimi ---
const toolButtons = document.querySelectorAll('.tool-button');

toolButtons.forEach(button => {
    button.addEventListener('click', () => {
        // "Temizle" ve "PNG İndir" düğmelerini araç olarak düşünmeyelim
        if (button.id === 'clearCanvas' || button.id === 'downloadImage' || button.parentNode.classList.contains('zoom-controls')) {
            return;
        }

        // Önceki aktif aracı kaldır
        document.querySelector('.tool-button.active')?.classList.remove('active');
        // Yeni aktif aracı ata
        button.classList.add('active');

        if (button.id === 'pencilTool') currentTool = 'pencil';
        else if (button.id === 'eraserTool') currentTool = 'eraser';
        else if (button.id === 'fillTool') currentTool = 'fill';
    });
});

// --- Çizim İşlevleri ---
function getPixelCoords(event) {
    const rect = canvas.getBoundingClientRect();
    // HTML canvas boyutundan, gerçek çizim çözünürlüğüne dönüştürüyoruz
    const x = Math.floor((event.clientX - rect.left) / (rect.width / CANVAS_WIDTH));
    const y = Math.floor((event.clientY - rect.top) / (rect.height / CANVAS_HEIGHT));
    return { x, y };
}

function drawPixel(x, y, color) {
    if (x >= 0 && x < CANVAS_WIDTH && y >= 0 && y < CANVAS_HEIGHT) {
        ctx.fillStyle = color;
        ctx.fillRect(x * PIXEL_SIZE, y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
    }
}

canvas.addEventListener('mousedown', (e) => {
    drawing = true;
    const { x, y } = getPixelCoords(e);
    if (currentTool === 'pencil') {
        drawPixel(x, y, currentColor);
    } else if (currentTool === 'eraser') {
        drawPixel(x, y, '#FFFFFF'); // Silgi için beyaz renk
    } else if (currentTool === 'fill') {
        floodFill(x, y, currentColor);
    }
});

canvas.addEventListener('mouseup', () => {
    drawing = false;
});

canvas.addEventListener('mousemove', (e) => {
    if (!drawing || currentTool === 'fill') return; // Doldurma aracında sürüklemeye gerek yok
    const { x, y } = getPixelCoords(e);
    if (currentTool === 'pencil') {
        drawPixel(x, y, currentColor);
    } else if (currentTool === 'eraser') {
        drawPixel(x, y, '#FFFFFF');
    }
});

canvas.addEventListener('mouseleave', () => {
    drawing = false;
});

// --- Temizle Butonu ---
clearCanvasBtn.addEventListener('click', () => {
    initializeCanvas();
});

// --- PNG İndir Butonu ---
downloadImageBtn.addEventListener('click', () => {
    // İndirirken orijinal 128x128 çözünürlüğü kullan
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = CANVAS_WIDTH;
    tempCanvas.height = CANVAS_HEIGHT;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(canvas, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT); // Orijinal boyutunda kopyala

    const dataURL = tempCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = 'piksel_art.png';
    link.href = dataURL;
    link.click();
});

// --- Doldurma Aracı (Flood Fill Algoritması) ---
function getPixelColor(x, y) {
    if (x < 0 || x >= CANVAS_WIDTH || y < 0 || y >= CANVAS_HEIGHT) {
        return null; // Geçersiz koordinatlar
    }
    const data = ctx.getImageData(x * PIXEL_SIZE, y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE).data;
    // RGBA değerlerini #RRGGBB formatına çevir
    const r = data[0].toString(16).padStart(2, '0');
    const g = data[1].toString(16).padStart(2, '0');
    const b = data[2].toString(16).padStart(2, '0');
    return `#${r}${g}${b}`.toUpperCase();
}

function floodFill(startX, startY, newColor) {
    const targetColor = getPixelColor(startX, startY);

    // Hedef renk ile yeni renk aynıysa veya geçersiz bir pikseldeyse bir şey yapma
    if (!targetColor || targetColor === newColor.toUpperCase()) {
        return;
    }

    const queue = [{ x: startX, y: startY }];
    const visited = new Set(); // Zaten ziyaret edilmiş pikselleri takip et

    while (queue.length > 0) {
        const { x, y } = queue.shift();
        const pixelKey = `${x},${y}`;

        // Geçerli sınırlar içinde mi ve henüz ziyaret edilmemiş mi?
        if (x < 0 || x >= CANVAS_WIDTH || y < 0 || y >= CANVAS_HEIGHT || visited.has(pixelKey)) continue;

        const currentColorAtPixel = getPixelColor(x, y);

        // Hedef renkte mi?
        if (currentColorAtPixel === targetColor) {
            drawPixel(x, y, newColor);
            visited.add(pixelKey);

            // Komşu pikselleri sıraya ekle
            queue.push({ x: x + 1, y: y });
            queue.push({ x: x - 1, y: y });
            queue.push({ x: x, y: y + 1 });
            queue.push({ x: x, y: y - 1 });
        }
    }
}

// --- Yakınlaştırma/Uzaklaştırma ---
zoomInBtn.addEventListener('click', () => {
    if (currentZoom < MAX_ZOOM) {
        currentZoom++;
        applyZoom();
    }
});

zoomOutBtn.addEventListener('click', () => {
    if (currentZoom > MIN_ZOOM) {
        currentZoom--;
        applyZoom();
    }
});

// Başlangıçta doğru yakınlaştırma seviyesini ayarla
applyZoom();