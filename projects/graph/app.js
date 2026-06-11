// ===== Global Variables =====
const canvas = document.getElementById('graphCanvas');
const ctx = canvas.getContext('2d');

let audioContext = null;
let oscillator = null;
let gainNode = null;

let isPlaying = false;
let isPaused = false;
let animationId = null;
let currentX = -Math.PI * 2;

// Settings
let playbackSpeed = 1.0;
let minFrequency = 220;
let maxFrequency = 880;
let waveformType = 'sine';
let currentFunction = 'sin(x)';

// Graph settings
const xRange = [-Math.PI * 2, Math.PI * 2];
const resolution = 500;

// Extrema editor state
let editMode = false;
let detectedExtrema = [];
let modifiedExtrema = [];
let dragIndex = -1;
let splineEvaluator = null;
let rafPending = false;

// ===== Initialize =====
function init() {
    setupCanvas();
    attachEventListeners();
    loadTheme();
    updateExtrema();
    drawGraph();
}

// ===== Canvas Setup =====
function setupCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = 400 * dpr;
    
    ctx.scale(dpr, dpr);
    canvas.style.width = rect.width + 'px';
    canvas.style.height = '400px';
}

function updateExtrema() {
    try {
        detectedExtrema = detectExtrema(currentFunction, xRange[0], xRange[1], resolution);
    } catch (e) {
        detectedExtrema = [];
    }
    modifiedExtrema = detectedExtrema.map(p => ({ ...p }));
    splineEvaluator = buildModifiedCurve(modifiedExtrema, currentFunction, xRange[0], xRange[1]);
    updateExtremaStatus();
}

function updateExtremaStatus() {
    const statusEl = document.getElementById('extremaStatus');
    if (!statusEl) return;
    const n = detectedExtrema.length;
    const modified = modifiedExtrema.some((p, i) => Math.abs(p.y - detectedExtrema[i].y) > 1e-10);
    statusEl.textContent = n === 0
        ? '극값 없음'
        : modified ? `극값 ${n}개 (수정됨)` : `극값 ${n}개 감지`;
}

// ===== Event Listeners =====
function attachEventListeners() {
    // Play/Pause/Stop controls
    document.getElementById('playBtn').addEventListener('click', play);
    document.getElementById('pauseBtn').addEventListener('click', pause);
    document.getElementById('stopBtn').addEventListener('click', stop);
    
    // Function input
    document.getElementById('functionInput').addEventListener('input', (e) => {
        currentFunction = e.target.value;
        editMode = false;
        updateExtrema();
        if (!isPlaying) drawGraph();
        clearError();
    });
    
    // Preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const func = e.target.dataset.func;
            document.getElementById('functionInput').value = func;
            currentFunction = func;
            editMode = false;
            updateExtrema();
            if (!isPlaying) drawGraph();
            clearError();
        });
    });
    
    // Speed slider
    document.getElementById('speedSlider').addEventListener('input', (e) => {
        playbackSpeed = parseFloat(e.target.value);
        document.getElementById('speedValue').textContent = playbackSpeed.toFixed(1);
    });
    
    // Frequency sliders
    document.getElementById('minFreq').addEventListener('input', (e) => {
        minFrequency = parseInt(e.target.value);
        document.getElementById('minFreqValue').textContent = minFrequency;
    });
    
    document.getElementById('maxFreq').addEventListener('input', (e) => {
        maxFrequency = parseInt(e.target.value);
        document.getElementById('maxFreqValue').textContent = maxFrequency;
    });
    
    // Waveform selector
    document.getElementById('waveform').addEventListener('change', (e) => {
        waveformType = e.target.value;
        if (oscillator && isPlaying && !isPaused) {
            oscillator.type = waveformType;
        }
    });
    
    // Theme toggle
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    
    // Window resize
    window.addEventListener('resize', () => {
        setupCanvas();
        drawGraph();
    });

    canvas.addEventListener('mousedown', onCanvasMouseDown);
    window.addEventListener('mousemove', onCanvasMouseMove);
    window.addEventListener('mouseup', onCanvasMouseUp);

    document.getElementById('editModeBtn').addEventListener('click', () => {
        editMode = !editMode;
        document.getElementById('editModeBtn').classList.toggle('active', editMode);
        if (editMode && detectedExtrema.length === 0) updateExtrema();
        drawGraph();
    });

    document.getElementById('resetExtremaBtn').addEventListener('click', () => {
        modifiedExtrema = detectedExtrema.map(p => ({ ...p }));
        splineEvaluator = buildModifiedCurve(modifiedExtrema, currentFunction, xRange[0], xRange[1]);
        updateExtremaStatus();
        if (!isPlaying) drawGraph();
    });
}

// ===== Graph Drawing =====
function drawGraph() {
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Get theme colors
    const isDark = document.body.dataset.theme === 'dark';
    const gridColor = isDark ? '#404040' : '#e0e0e0';
    const axisColor = isDark ? '#666666' : '#999999';
    const lineColor = isDark ? '#4a90e2' : '#357abd';
    const textColor = isDark ? '#a0a0a0' : '#666666';
    
    // Draw grid
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    
    for (let i = 0; i <= 10; i++) {
        const y = (height / 10) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }
    
    for (let i = 0; i <= 10; i++) {
        const x = (width / 10) * i;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }
    
    // Draw axes
    ctx.strokeStyle = axisColor;
    ctx.lineWidth = 2;
    
    const centerY = height / 2;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();
    
    // Calculate Y range
    let yValues = [];
    try {
        for (let i = 0; i < resolution; i++) {
            const x = xRange[0] + (xRange[1] - xRange[0]) * (i / resolution);
            const y = evaluateFunction(currentFunction, x);
            if (isFinite(y)) yValues.push(y);
        }
    } catch (e) {
        showError('함수를 파싱할 수 없습니다: ' + e.message);
        return;
    }
    
    if (yValues.length === 0) {
        showError('유효한 함수 값이 없습니다');
        return;
    }
    
    const yMin = Math.min(...yValues);
    const yMax = Math.max(...yValues);
    const yPadding = (yMax - yMin) * 0.1 || 1;
    
    // Draw Y axis labels
    ctx.fillStyle = textColor;
    ctx.font = '12px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(yMax.toFixed(2), width - 5, 15);
    ctx.fillText(yMin.toFixed(2), width - 5, height - 5);
    ctx.fillText('0', width - 5, centerY - 5);
    
    // Draw function curve
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    let firstPoint = true;
    for (let i = 0; i < resolution; i++) {
        const x = xRange[0] + (xRange[1] - xRange[0]) * (i / resolution);
        const y = evaluateFunction(currentFunction, x);
        
        if (!isFinite(y)) continue;
        
        const pixelX = (i / resolution) * width;
        const normalizedY = (y - yMin - yPadding) / (yMax - yMin + yPadding * 2);
        const pixelY = height - (normalizedY * height);
        
        if (firstPoint) {
            ctx.moveTo(pixelX, pixelY);
            firstPoint = false;
        } else {
            ctx.lineTo(pixelX, pixelY);
        }
    }
    
    ctx.stroke();

    if (modifiedExtrema.length > 0) {
        const maxColor = getComputedStyle(document.documentElement).getPropertyValue('--extrema-max-color').trim() || '#e74c3c';
        const minColor = getComputedStyle(document.documentElement).getPropertyValue('--extrema-min-color').trim() || '#2ecc71';

        modifiedExtrema.forEach((pt, idx) => {
            const normalizedX = (pt.x - xRange[0]) / (xRange[1] - xRange[0]);
            const pixelX = normalizedX * width;
            const normalizedY = (pt.y - yMin - yPadding) / (yMax - yMin + yPadding * 2);
            const pixelY = height - (normalizedY * height);

            const isHovered = (idx === dragIndex);
            const radius = isHovered ? 10 : 8;
            const color = pt.type === 'maximum' ? maxColor : minColor;

            ctx.beginPath();
            ctx.arc(pixelX, pixelY, radius, 0, Math.PI * 2);
            ctx.fillStyle = isHovered ? 'white' : color;
            ctx.fill();
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.stroke();
        });

        if (editMode && splineEvaluator) {
            const splineColor = getComputedStyle(document.documentElement).getPropertyValue('--extrema-spline-color').trim() || '#ff9800';
            ctx.strokeStyle = splineColor;
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 3]);
            ctx.beginPath();
            let firstSplinePoint = true;
            for (let i = 0; i < resolution; i++) {
                const x = xRange[0] + (xRange[1] - xRange[0]) * (i / resolution);
                const y = splineEvaluator(x);
                if (!isFinite(y)) continue;
                const pxX = (i / resolution) * width;
                const normY = (y - yMin - yPadding) / (yMax - yMin + yPadding * 2);
                const pxY = height - (normY * height);
                if (firstSplinePoint) { ctx.moveTo(pxX, pxY); firstSplinePoint = false; }
                else ctx.lineTo(pxX, pxY);
            }
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }
    
    // Draw cursor if playing
    if (isPlaying && !isPaused) {
        drawCursor(currentX);
    }
}

function drawCursor(x) {
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    
    const normalizedX = (x - xRange[0]) / (xRange[1] - xRange[0]);
    const pixelX = normalizedX * width;
    
    // Draw vertical cursor line
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(pixelX, 0);
    ctx.lineTo(pixelX, height);
    ctx.stroke();
    ctx.setLineDash([]);
    
    const y = (editMode && splineEvaluator) ? splineEvaluator(x) : evaluateFunction(currentFunction, x);
    if (isFinite(y)) {
        let yValues = [];
        for (let i = 0; i < resolution; i++) {
            const testX = xRange[0] + (xRange[1] - xRange[0]) * (i / resolution);
            const testY = (editMode && splineEvaluator) ? splineEvaluator(testX) : evaluateFunction(currentFunction, testX);
            if (isFinite(testY)) yValues.push(testY);
        }
        
        if (yValues.length === 0) return;
        const yMin = Math.min(...yValues);
        const yMax = Math.max(...yValues);
        if (yMax === yMin) return;
        const yPadding = (yMax - yMin) * 0.1 || 1;
        const normalizedY = (y - yMin - yPadding) / (yMax - yMin + yPadding * 2);
        const pixelY = height - (normalizedY * height);
        
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.arc(pixelX, pixelY, 6, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ===== Function Evaluation =====
function evaluateFunction(funcStr, x) {
    try {
        const scope = { x: x };
        return math.evaluate(funcStr, scope);
    } catch (e) {
        throw new Error('함수 평가 실패: ' + e.message);
    }
}

// ===== Extrema Detection =====
function detectExtrema(funcStr, xMin, xMax, numSamples) {
    // Compile function for fast repeated evaluation
    const fCode = math.compile(funcStr);
    const fScope = { x: 0 };

    // Build derivative function: try symbolic first, fallback to numerical
    let df;
    try {
        const dNode = math.derivative(funcStr, 'x');
        const dCode = dNode.compile();
        const dScope = { x: 0 };
        df = (x) => { dScope.x = x; return dCode.evaluate(dScope); };
    } catch (e) {
        // Fallback: central difference with adaptive h
        df = (x) => {
            const h = Math.cbrt(Number.EPSILON) * Math.max(1, Math.abs(x));
            fScope.x = x + h;
            const fph = fCode.evaluate(fScope);
            fScope.x = x - h;
            const fmh = fCode.evaluate(fScope);
            return (fph - fmh) / (2 * h);
        };
    }

    // Sample y values to compute yRange for discontinuity detection
    const xs = [];
    const ys = [];
    for (let i = 0; i < numSamples; i++) {
        const x = xMin + (i / (numSamples - 1)) * (xMax - xMin);
        xs.push(x);
        try {
            fScope.x = x;
            const y = fCode.evaluate(fScope);
            ys.push(isFinite(y) ? y : null);
        } catch (e) {
            ys.push(null);
        }
    }
    const validYs = ys.filter(v => v !== null);
    const yRange = validYs.length > 1
        ? Math.max(...validYs) - Math.min(...validYs)
        : 1;
    const jumpThreshold = yRange * 0.5;
    const flatThreshold = 1e-8;

    // Bisect to refine extremum location
    function bisectRoot(a, b) {
        let dfa = df(a);
        for (let iter = 0; iter < 52; iter++) {
            const mid = (a + b) / 2;
            if ((b - a) / 2 < 1e-10) return mid;
            let dfmid;
            try { dfmid = df(mid); } catch (e) { return null; }
            if (!isFinite(dfmid)) return null;
            if (dfmid === 0) return mid;
            if (Math.sign(dfa) === Math.sign(dfmid)) { a = mid; dfa = dfmid; }
            else b = mid;
        }
        return (a + b) / 2;
    }

    const rawExtrema = [];
    for (let i = 1; i < xs.length; i++) {
        const x0 = xs[i - 1], x1 = xs[i];
        const y0 = ys[i - 1], y1 = ys[i];

        // Skip if either y is invalid
        if (y0 === null || y1 === null) continue;
        // Skip discontinuities (e.g. tan(x) poles)
        if (Math.abs(y1 - y0) > jumpThreshold) continue;

        let d0, d1;
        try { d0 = df(x0); } catch (e) { continue; }
        try { d1 = df(x1); } catch (e) { continue; }
        if (!isFinite(d0) || !isFinite(d1)) continue;
        // Skip flat regions
        if (Math.abs(d0) < flatThreshold && Math.abs(d1) < flatThreshold) continue;
        // Sign change in derivative = extremum bracket
        if (Math.sign(d0) !== Math.sign(d1) && d0 !== 0 && d1 !== 0) {
            const xExact = bisectRoot(x0, x1);
            if (xExact === null) continue;
            let yExact;
            try { fScope.x = xExact; yExact = fCode.evaluate(fScope); } catch (e) { continue; }
            if (!isFinite(yExact)) continue;
            rawExtrema.push({
                x: xExact,
                y: yExact,
                type: d0 > 0 ? 'maximum' : 'minimum'
            });
        }
    }

    // Deduplicate near-coincident extrema (keep the one with larger |y|)
    const extrema = [];
    for (const pt of rawExtrema) {
        const last = extrema[extrema.length - 1];
        if (last && Math.abs(pt.x - last.x) < 1e-8) {
            if (Math.abs(pt.y) > Math.abs(last.y)) extrema[extrema.length - 1] = pt;
        } else {
            extrema.push(pt);
        }
    }

    return extrema;
}

// ===== Natural Cubic Spline Interpolation =====
function naturalCubicSpline(points) {
    // Handle degenerate cases
    if (!points || points.length < 2) {
        return (x) => 0;
    }
    if (points.length === 2) {
        // Linear interpolation for exactly 2 points
        const [p0, p1] = points;
        return (x) => {
            if (x <= p0.x) return p0.y;
            if (x >= p1.x) return p1.y;
            const t = (x - p0.x) / (p1.x - p0.x);
            return p0.y + t * (p1.y - p0.y);
        };
    }

    const n = points.length;
    const h = new Array(n - 1);
    const alpha = new Array(n - 1).fill(0);
    const l = new Array(n).fill(0);
    const mu = new Array(n).fill(0);
    const z = new Array(n).fill(0);
    const c = new Array(n).fill(0);
    const b = new Array(n - 1).fill(0);
    const d = new Array(n - 1).fill(0);

    // Compute intervals
    for (let i = 0; i < n - 1; i++) {
        h[i] = points[i + 1].x - points[i].x;
        if (h[i] <= 0) h[i] = 1e-10; // guard against zero/negative intervals
    }

    // Compute alpha values (second-divided-differences)
    for (let i = 1; i < n - 1; i++) {
        alpha[i] = (3 / h[i]) * (points[i + 1].y - points[i].y)
                 - (3 / h[i - 1]) * (points[i].y - points[i - 1].y);
    }

    // Natural boundary conditions: second derivative = 0 at endpoints
    l[0] = 1; mu[0] = 0; z[0] = 0;

    // Forward sweep (tridiagonal solver)
    for (let i = 1; i < n - 1; i++) {
        l[i] = 2 * (points[i + 1].x - points[i - 1].x) - h[i - 1] * mu[i - 1];
        mu[i] = h[i] / l[i];
        z[i] = (alpha[i] - h[i - 1] * z[i - 1]) / l[i];
    }

    l[n - 1] = 1; z[n - 1] = 0; c[n - 1] = 0;

    // Back substitution
    for (let j = n - 2; j >= 0; j--) {
        c[j] = z[j] - mu[j] * c[j + 1];
        b[j] = (points[j + 1].y - points[j].y) / h[j]
             - h[j] * (c[j + 1] + 2 * c[j]) / 3;
        d[j] = (c[j + 1] - c[j]) / (3 * h[j]);
    }

    // Return evaluator: clamp at boundaries, linear scan for segment
    return function evalSpline(x) {
        // Clamp to defined range
        if (x <= points[0].x) return points[0].y;
        if (x >= points[n - 1].x) return points[n - 1].y;

        // Find containing segment (linear scan — n is small, <30 points)
        let i = 0;
        for (i = 0; i < n - 1; i++) {
            if (x >= points[i].x && x <= points[i + 1].x) break;
        }

        const dx = x - points[i].x;
        // a + b*dx + c*dx² + d*dx³
        let y = points[i].y + b[i] * dx + c[i] * dx * dx + d[i] * dx * dx * dx;

        // Clamp overshoot: don't exceed the range of adjacent extrema
        const yMin = Math.min(points[i].y, points[i + 1].y);
        const yMax = Math.max(points[i].y, points[i + 1].y);
        const margin = Math.abs(yMax - yMin) * 0.5 + 0.1;
        y = Math.max(yMin - margin, Math.min(yMax + margin, y));

        return y;
    };
}

function buildModifiedCurve(extrema, funcStr, xMin, xMax) {
    // Build control points: anchor at xMin, all extrema, anchor at xMax
    const fCode = math.compile(funcStr);
    const scope = { x: 0 };
    const evalF = (x) => { scope.x = x; return fCode.evaluate(scope); };

    const anchorStart = { x: xMin, y: evalF(xMin) };
    const anchorEnd   = { x: xMax, y: evalF(xMax) };

    // Combine: start anchor + extrema + end anchor, ensure x is sorted and no duplicates
    const allPoints = [anchorStart, ...extrema, anchorEnd]
        .filter(p => isFinite(p.x) && isFinite(p.y))
        .sort((a, b) => a.x - b.x);

    // Deduplicate by x (keep last if x values are within 1e-8)
    const deduped = [];
    for (const pt of allPoints) {
        const last = deduped[deduped.length - 1];
        if (last && Math.abs(pt.x - last.x) < 1e-8) {
            deduped[deduped.length - 1] = pt;
        } else {
            deduped.push(pt);
        }
    }

    return naturalCubicSpline(deduped);
}

function onCanvasMouseDown(e) {
    if (!editMode || modifiedExtrema.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;

    let yValues = [];
    for (let i = 0; i < resolution; i++) {
        const x = xRange[0] + (xRange[1] - xRange[0]) * (i / resolution);
        try { const y = evaluateFunction(currentFunction, x); if (isFinite(y)) yValues.push(y); } catch (err) {}
    }
    if (yValues.length === 0) return;
    const yMin = Math.min(...yValues);
    const yMax = Math.max(...yValues);
    const yPadding = (yMax - yMin) * 0.1 || 1;

    for (let idx = 0; idx < modifiedExtrema.length; idx++) {
        const pt = modifiedExtrema[idx];
        const normalizedX = (pt.x - xRange[0]) / (xRange[1] - xRange[0]);
        const dotX = normalizedX * width;
        const normalizedY = (pt.y - yMin - yPadding) / (yMax - yMin + yPadding * 2);
        const dotY = height - (normalizedY * height);

        if (Math.hypot(mouseX - dotX, mouseY - dotY) < 12) {
            dragIndex = idx;
            canvas.style.cursor = 'ns-resize';
            canvas._dragYMin = yMin;
            canvas._dragYMax = yMax;
            canvas._dragYPadding = yPadding;
            return;
        }
    }
}

function onCanvasMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;

    if (dragIndex !== -1) {
        const yMin = canvas._dragYMin;
        const yMax = canvas._dragYMax;
        const yPadding = canvas._dragYPadding;
        const normalizedY = 1 - (mouseY / height);
        const newY = normalizedY * (yMax - yMin + yPadding * 2) + yMin + yPadding;

        modifiedExtrema[dragIndex] = { ...modifiedExtrema[dragIndex], y: newY };
        splineEvaluator = buildModifiedCurve(modifiedExtrema, currentFunction, xRange[0], xRange[1]);

        const statusEl = document.getElementById('extremaStatus');
        if (statusEl) {
            statusEl.textContent = `극값 ${detectedExtrema.length}개 (수정 중: y=${newY.toFixed(3)})`;
        }

        if (!rafPending) {
            rafPending = true;
            requestAnimationFrame(() => {
                rafPending = false;
                if (!isPlaying) drawGraph();
            });
        }
        return;
    }

    if (!editMode || modifiedExtrema.length === 0) {
        canvas.style.cursor = 'default';
        return;
    }
    let yValues = [];
    for (let i = 0; i < resolution; i++) {
        const x = xRange[0] + (xRange[1] - xRange[0]) * (i / resolution);
        try { const y = evaluateFunction(currentFunction, x); if (isFinite(y)) yValues.push(y); } catch (err) {}
    }
    if (yValues.length === 0) return;
    const yMin = Math.min(...yValues);
    const yMax = Math.max(...yValues);
    const yPadding = (yMax - yMin) * 0.1 || 1;

    let nearDot = false;
    for (const pt of modifiedExtrema) {
        const normalizedX = (pt.x - xRange[0]) / (xRange[1] - xRange[0]);
        const dotX = normalizedX * width;
        const normalizedY = (pt.y - yMin - yPadding) / (yMax - yMin + yPadding * 2);
        const dotY = height - (normalizedY * height);
        if (Math.hypot(mouseX - dotX, mouseY - dotY) < 12) { nearDot = true; break; }
    }
    canvas.style.cursor = nearDot ? 'pointer' : 'default';
}

function onCanvasMouseUp(e) {
    if (dragIndex !== -1) {
        dragIndex = -1;
        canvas.style.cursor = 'default';
        if (!isPlaying) drawGraph();
    }
}

// ===== Audio Playback =====
function play() {
    if (isPaused) {
        resumeAudio();
        return;
    }
    
    // Initialize Audio Context
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    // Resume context if suspended (browser autoplay policy)
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    
    isPlaying = true;
    isPaused = false;
    currentX = xRange[0];
    
    updateButtons();
    startAudio();
    animate();
}

function pause() {
    isPaused = true;
    updateButtons();
    
    if (oscillator) {
        oscillator.stop();
        oscillator = null;
    }
    
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
}

function resumeAudio() {
    isPaused = false;
    updateButtons();
    startAudio();
    animate();
}

function stop() {
    isPlaying = false;
    isPaused = false;
    currentX = xRange[0];
    
    updateButtons();
    
    if (oscillator) {
        oscillator.stop();
        oscillator = null;
    }
    
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    
    drawGraph();
}

function startAudio() {
    // Create oscillator
    oscillator = audioContext.createOscillator();
    oscillator.type = waveformType;
    
    // Create gain node for smooth transitions
    gainNode = audioContext.createGain();
    gainNode.gain.value = 0.3;
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.start();
}

function animate() {
    if (!isPlaying || isPaused) return;
    
    // Calculate Y value (use spline if in edit mode)
    const y = (editMode && splineEvaluator) ? splineEvaluator(currentX) : evaluateFunction(currentFunction, currentX);
    
    if (isFinite(y)) {
        // Map Y to frequency
        const frequency = mapToFrequency(y);
        if (oscillator) {
            oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        }
    }
    
    // Draw graph with cursor
    drawGraph();
    
    // Advance X
    const step = (xRange[1] - xRange[0]) / (resolution * 2) * playbackSpeed;
    currentX += step;
    
    // Loop or stop at end
    if (currentX >= xRange[1]) {
        currentX = xRange[0];
        // Optional: stop at end instead of loop
        // stop();
        // return;
    }
    
    animationId = requestAnimationFrame(animate);
}

function mapToFrequency(y) {
    let yValues = [];
    for (let i = 0; i < resolution; i++) {
        const x = xRange[0] + (xRange[1] - xRange[0]) * (i / resolution);
        let testY;
        if (editMode && splineEvaluator) {
            testY = splineEvaluator(x);
        } else {
            testY = evaluateFunction(currentFunction, x);
        }
        if (isFinite(testY)) yValues.push(testY);
    }
    
    if (yValues.length === 0) return Math.max(20, minFrequency);
    
    const yMin = Math.min(...yValues);
    const yMax = Math.max(...yValues);
    
    if (yMax === yMin) return Math.max(20, (minFrequency + maxFrequency) / 2);
    
    const normalized = (y - yMin) / (yMax - yMin);
    
    return Math.max(20, minFrequency + normalized * (maxFrequency - minFrequency));
}

// ===== UI Helpers =====
function updateButtons() {
    document.getElementById('playBtn').disabled = isPlaying && !isPaused;
    document.getElementById('pauseBtn').disabled = !isPlaying || isPaused;
    document.getElementById('stopBtn').disabled = !isPlaying;
}

function showError(message) {
    document.getElementById('errorMsg').textContent = '⚠️ ' + message;
}

function clearError() {
    document.getElementById('errorMsg').textContent = '';
}

// ===== Theme Toggle =====
function toggleTheme() {
    const current = document.body.dataset.theme;
    const newTheme = current === 'dark' ? 'light' : 'dark';
    document.body.dataset.theme = newTheme;
    localStorage.setItem('theme', newTheme);
    drawGraph();
}

function loadTheme() {
    const saved = localStorage.getItem('theme');
    if (saved) {
        document.body.dataset.theme = saved;
    } else {
        // Detect system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.body.dataset.theme = prefersDark ? 'dark' : 'light';
    }
}

// ===== Start App =====
init();
