const canvas = document.getElementById('logicCanvas');
const ctx = canvas.getContext('2d');
const container = document.getElementById('canvasContainer');
const statsText = document.getElementById('statsText');
const selectedCountEl = document.getElementById('selectedCount');
const dupCountInput = document.getElementById('dupCountInput');
const saveToast = document.getElementById('saveToast');
const zoomResetBtn = document.getElementById('zoomResetBtn');

let nodes = [];
let wires = [];
let selectedNodeIds = new Set();
let nextId = 1;
let activeSlot = null;

// มุมมองกระดาน (Pan & Zoom)
let camera = {
    x: 0,
    y: 0,
    zoom: 1,
    minZoom: 0.35,
    maxZoom: 2.5
};
let isSpacePressed = false;
let isPanning = false;
let panStartScreen = { x: 0, y: 0 };
let panStartCamera = { x: 0, y: 0 };

// สถานะการโต้ตอบ
let draggingNodes = [];
let selectionBox = null;
let activePushButton = null;
let wiringStart = null;
let mouseScreen = { x: 0, y: 0 };
let mouseWorld = { x: 0, y: 0 };
let hoveredPin = null;

// Input ช่องเดียว (1) สำหรับ Logic Gate และ LED
const GATE_SPECS = {
    SWITCH: { w: 94, h: 56, inputs: 0, outputs: 1, color: '#7dd3fc' },
    BUTTON: { w: 94, h: 56, inputs: 0, outputs: 1, color: '#f06d3b' },
    CLOCK:  { w: 98, h: 62, inputs: 0, outputs: 1, color: '#c084fc' },
    LED:    { w: 94, h: 56, inputs: 1, outputs: 0, color: '#fda4af' },
    NOT:    { w: 96, h: 56, inputs: 1, outputs: 1, color: '#fbbf24' },
    AND:    { w: 100, h: 58, inputs: 1, outputs: 1, color: '#4ade80' },
    OR:     { w: 100, h: 58, inputs: 1, outputs: 1, color: '#34d399' },
    NAND:   { w: 104, h: 58, inputs: 1, outputs: 1, color: '#f472b6' },
    NOR:    { w: 104, h: 58, inputs: 1, outputs: 1, color: '#60a5fa' },
    XOR:    { w: 100, h: 58, inputs: 1, outputs: 1, color: '#a78bfa' }
};

function resizeCanvas() {
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function screenToWorld(sx, sy) {
    return {
        x: (sx - camera.x) / camera.zoom,
        y: (sy - camera.y) / camera.zoom
    };
}

function setZoom(newZoom, anchorScreenX = canvas.width / 2, anchorScreenY = canvas.height / 2) {
    const clamped = Math.max(camera.minZoom, Math.min(camera.maxZoom, newZoom));
    const worldBefore = screenToWorld(anchorScreenX, anchorScreenY);
    camera.zoom = clamped;
    camera.x = anchorScreenX - worldBefore.x * camera.zoom;
    camera.y = anchorScreenY - worldBefore.y * camera.zoom;
    zoomResetBtn.innerText = `${Math.round(camera.zoom * 100)}%`;
}

function resetCamera() {
    camera.x = 0;
    camera.y = 0;
    camera.zoom = 1;
    zoomResetBtn.innerText = '100%';
}

function addNode(type, x, y, initialState = false, intervalMs = 1000) {
    const spec = GATE_SPECS[type];
    const centerWorld = screenToWorld(canvas.width / 2, canvas.height / 2);
    const node = {
        id: nextId++,
        type,
        x: x ?? (centerWorld.x - spec.w / 2 + (Math.random() * 80 - 40)),
        y: y ?? (centerWorld.y - spec.h / 2 + (Math.random() * 80 - 40)),
        w: spec.w,
        h: spec.h,
        inputs: Array(spec.inputs).fill(false),
        output: Boolean(initialState),
        state: Boolean(initialState),
        intervalMs: intervalMs,
        lastTick: performance.now()
    };
    nodes.push(node);
    updateStats();
    return node;
}

function getPinPosition(node, isOutput, index) {
    if (isOutput) {
        return { x: node.x + node.w, y: node.y + node.h / 2 };
    } else {
        const count = node.inputs.length;
        const spacing = node.h / (count + 1);
        return { x: node.x, y: node.y + spacing * (index + 1) };
    }
}

function simulateCircuit(now) {
    // 1. อัปเดตนาฬิกา CLOCK
    nodes.forEach(n => {
        if (n.type === 'CLOCK') {
            if (!n.lastTick) n.lastTick = now;
            if (now - n.lastTick >= n.intervalMs) {
                n.state = !n.state;
                n.lastTick = now;
            }
            n.output = Boolean(n.state);
        } else if (n.type === 'SWITCH' || n.type === 'BUTTON') {
            n.output = Boolean(n.state);
        }
    });

    // 2. เตรียมตัวนับจำนวนสายทั้งหมด และจำนวนสายที่ส่งค่า true เข้าพิน
    nodes.forEach(n => {
        n.inputs.fill(false);
        n._wireTotal = Array(n.inputs.length).fill(0);
        n._wireActive = Array(n.inputs.length).fill(0);
    });

    wires.forEach(w => {
        const fromNode = nodes.find(n => n.id === w.fromNode);
        const toNode = nodes.find(n => n.id === w.toNode);
        const pinIdx = w.toPin || 0;
        if (fromNode && toNode && pinIdx < toNode.inputs.length) {
            toNode._wireTotal[pinIdx] += 1;
            if (fromNode.output) {
                toNode._wireActive[pinIdx] += 1;
                toNode.inputs[pinIdx] = true;
            }
        }
    });

    // 3. คำนวณ Output ของเกตและ LED
    nodes.forEach(n => {
        if (n.type === 'SWITCH' || n.type === 'BUTTON' || n.type === 'CLOCK') {
            n.output = Boolean(n.state);
            return;
        }

        const total = n._wireTotal ? (n._wireTotal[0] || 0) : 0;
        const active = n._wireActive ? (n._wireActive[0] || 0) : (n.inputs[0] ? 1 : 0);
        const hasSignal = active > 0;

        switch (n.type) {
            case 'LED':
                n.state = hasSignal;
                n.output = hasSignal;
                break;
            case 'NOT':
                n.output = !hasSignal;
                break;
            case 'AND':
                n.output = total > 0 && active === total;
                break;
            case 'OR':
                n.output = active > 0;
                break;
            case 'NAND':
                n.output = !(total > 0 && active === total);
                break;
            case 'NOR':
                n.output = active === 0;
                break;
            case 'XOR':
                n.output = (active % 2) === 1;
                break;
            default:
                n.output = hasSignal;
                break;
        }
    });
}

function drawGrid() {
    const step = 40;
    const topLeft = screenToWorld(0, 0);
    const bottomRight = screenToWorld(canvas.width, canvas.height);

    const startX = Math.floor(topLeft.x / step) * step;
    const endX = Math.ceil(bottomRight.x / step) * step;
    const startY = Math.floor(topLeft.y / step) * step;
    const endY = Math.ceil(bottomRight.y / step) * step;

    ctx.strokeStyle = 'rgba(243, 242, 237, 0.035)';
    ctx.lineWidth = 1 / camera.zoom;

    ctx.beginPath();
    for (let x = startX; x <= endX; x += step) {
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
    }
    for (let y = startY; y <= endY; y += step) {
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
    }
    ctx.stroke();
}

// วาดเส้นเชื่อมเป็นเส้นตรง
function drawWire(x1, y1, x2, y2, isActive) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);

    if (isActive) {
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = '#4ade80';
        ctx.shadowColor = 'rgba(74, 222, 128, 0.35)';
        ctx.shadowBlur = 10;
    } else {
        ctx.lineWidth = 2.2;
        ctx.strokeStyle = 'rgba(243, 242, 237, 0.25)';
        ctx.shadowBlur = 0;
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
}

function drawNode(node) {
    const spec = GATE_SPECS[node.type];
    const isPowered = node.output;
    const isSelected = selectedNodeIds.has(node.id);

    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;

    ctx.fillStyle = '#1f1f1d';
    if (isSelected) {
        ctx.strokeStyle = '#f06d3b';
        ctx.lineWidth = 2.2;
    } else if (isPowered) {
        ctx.strokeStyle = '#4ade80';
        ctx.lineWidth = 2;
    } else {
        ctx.strokeStyle = '#383834';
        ctx.lineWidth = 1.5;
    }

    ctx.beginPath();
    ctx.roundRect(node.x, node.y, node.w, node.h, 12);
    ctx.fill();
    ctx.stroke();

    if (isSelected) {
        ctx.save();
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = '#f06d3b';
        ctx.lineWidth = 1.4;
        ctx.strokeRect(node.x - 4, node.y - 4, node.w + 8, node.h + 8);
        ctx.restore();
    }

    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    ctx.fillStyle = spec.color;
    ctx.beginPath();
    ctx.roundRect(node.x + 14, node.y, node.w - 28, 3.5, 2);
    ctx.fill();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (node.type === 'SWITCH') {
        ctx.fillStyle = node.state ? '#4ade80' : '#292926';
        ctx.beginPath();
        ctx.arc(node.x + node.w / 2, node.y + node.h / 2, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = node.state ? '#f3f2ed' : '#383834';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = node.state ? '#161615' : '#f3f2ed';
        ctx.font = 'bold 13px "JetBrains Mono", monospace';
        ctx.fillText(node.state ? '1' : '0', node.x + node.w / 2, node.y + node.h / 2);
    } else if (node.type === 'BUTTON') {
        ctx.fillStyle = node.state ? '#f06d3b' : '#292926';
        ctx.beginPath();
        ctx.roundRect(node.x + node.w / 2 - 24, node.y + node.h / 2 - 14, 48, 28, 8);
        ctx.fill();
        ctx.strokeStyle = node.state ? '#f3f2ed' : '#383834';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = node.state ? '#161615' : '#f3f2ed';
        ctx.font = 'bold 11px "JetBrains Mono", monospace';
        ctx.fillText('PUSH', node.x + node.w / 2, node.y + node.h / 2);
    } else if (node.type === 'CLOCK') {
        ctx.fillStyle = '#f3f2ed';
        ctx.font = 'bold 12px "JetBrains Mono", monospace';
        ctx.fillText('CLOCK', node.x + node.w / 2, node.y + node.h / 2 - 7);

        ctx.fillStyle = '#4ade80';
        ctx.font = 'bold 11px "JetBrains Mono", monospace';
        ctx.fillText(`${(node.intervalMs / 1000).toFixed(1)}s ⚙`, node.x + node.w / 2, node.y + node.h / 2 + 11);
    } else if (node.type === 'LED') {
        ctx.fillStyle = node.state ? '#4ade80' : '#292926';
        if (node.state) {
            ctx.shadowColor = 'rgba(74, 222, 128, 0.45)';
            ctx.shadowBlur = 16;
        }
        ctx.beginPath();
        ctx.arc(node.x + node.w / 2, node.y + node.h / 2, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = node.state ? '#161615' : '#b8b6ae';
        ctx.font = 'bold 11px "JetBrains Mono", monospace';
        ctx.fillText(node.state ? 'ON' : 'OFF', node.x + node.w / 2, node.y + node.h / 2);
    } else {
        ctx.fillStyle = '#f3f2ed';
        ctx.font = 'bold 14px "JetBrains Mono", monospace';
        ctx.fillText(node.type, node.x + node.w / 2, node.y + node.h / 2);
    }

    // วาดจุด Input Pin (1 ช่องฝั่งซ้าย)
    for (let i = 0; i < node.inputs.length; i++) {
        const pos = getPinPosition(node, false, i);
        const isHovered = hoveredPin && hoveredPin.nodeId === node.id && !hoveredPin.isOutput && hoveredPin.pinIndex === i;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, isHovered ? 8 : 6, 0, Math.PI * 2);
        ctx.fillStyle = node.inputs[i] ? '#4ade80' : '#292926';
        ctx.fill();
        ctx.strokeStyle = '#f3f2ed';
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }

    // วาดจุด Output Pin (ฝั่งขวา)
    if (spec.outputs > 0) {
        const pos = getPinPosition(node, true, 0);
        const isHovered = hoveredPin && hoveredPin.nodeId === node.id && hoveredPin.isOutput;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, isHovered ? 8 : 6, 0, Math.PI * 2);
        ctx.fillStyle = node.output ? '#4ade80' : '#7dd3fc';
        ctx.fill();
        ctx.strokeStyle = '#f3f2ed';
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }
}

function drawSelectionBox() {
    if (!selectionBox) return;
    const x = Math.min(selectionBox.startX, selectionBox.currentX);
    const y = Math.min(selectionBox.startY, selectionBox.currentY);
    const w = Math.abs(selectionBox.currentX - selectionBox.startX);
    const h = Math.abs(selectionBox.currentY - selectionBox.startY);

    ctx.save();
    ctx.fillStyle = 'rgba(240, 109, 59, 0.12)';
    ctx.strokeStyle = '#f06d3b';
    ctx.lineWidth = 1.5 / camera.zoom;
    ctx.setLineDash([6, 4]);
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
}

function renderLoop(now) {
    simulateCircuit(now);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.zoom, camera.zoom);

    drawGrid();

    wires.forEach(w => {
        const fromNode = nodes.find(n => n.id === w.fromNode);
        const toNode = nodes.find(n => n.id === w.toNode);
        if (fromNode && toNode) {
            const p1 = getPinPosition(fromNode, true, 0);
            const p2 = getPinPosition(toNode, false, w.toPin || 0);
            drawWire(p1.x, p1.y, p2.x, p2.y, Boolean(fromNode.output));
        }
    });

    if (wiringStart) {
        const fromNode = nodes.find(n => n.id === wiringStart.nodeId);
        if (fromNode) {
            const p1 = getPinPosition(fromNode, true, 0);
            drawWire(p1.x, p1.y, mouseWorld.x, mouseWorld.y, true);
        }
    }

    nodes.forEach(drawNode);
    drawSelectionBox();

    ctx.restore();

    requestAnimationFrame(renderLoop);
}

function findPinAt(wx, wy) {
    const hitRadius = 14 / camera.zoom;
    for (const node of nodes) {
        const spec = GATE_SPECS[node.type];
        if (spec.outputs > 0) {
            const p = getPinPosition(node, true, 0);
            if (Math.hypot(wx - p.x, wy - p.y) <= hitRadius) {
                return { nodeId: node.id, isOutput: true, pinIndex: 0 };
            }
        }
        for (let i = 0; i < node.inputs.length; i++) {
            const p = getPinPosition(node, false, i);
            if (Math.hypot(wx - p.x, wy - p.y) <= hitRadius) {
                return { nodeId: node.id, isOutput: false, pinIndex: i };
            }
        }
    }
    return null;
}

function findNodeAt(wx, wy) {
    for (let i = nodes.length - 1; i >= 0; i--) {
        const n = nodes[i];
        if (wx >= n.x && wx <= n.x + n.w && wy >= n.y && wy <= n.y + n.h) {
            return n;
        }
    }
    return null;
}

function deleteSelectedNodes() {
    if (selectedNodeIds.size === 0) return;
    const count = selectedNodeIds.size;
    nodes = nodes.filter(n => !selectedNodeIds.has(n.id));
    wires = wires.filter(w => !selectedNodeIds.has(w.fromNode) && !selectedNodeIds.has(w.toNode));
    selectedNodeIds.clear();
    updateStats();
    showToast(`ลบแล้ว ${count} อุปกรณ์`);
}

function duplicateSelectedNodes(times = 1) {
    if (selectedNodeIds.size === 0) {
        showToast('กรุณาเลือกอุปกรณ์ก่อนทำซ้ำ');
        return;
    }

    const baseNodes = nodes.filter(n => selectedNodeIds.has(n.id));
    const baseNodeIds = new Set(baseNodes.map(n => n.id));
    const internalWires = wires.filter(w => baseNodeIds.has(w.fromNode) && baseNodeIds.has(w.toNode));

    const repeatCount = Math.max(1, Math.min(50, parseInt(times, 10) || 1));
    const newSelection = new Set();

    for (let step = 1; step <= repeatCount; step++) {
        const idMap = new Map();
        const offsetX = 36 * step;
        const offsetY = 36 * step;

        baseNodes.forEach(src => {
            const cloned = addNode(src.type, src.x + offsetX, src.y + offsetY, false, src.intervalMs);
            idMap.set(src.id, cloned.id);
            newSelection.add(cloned.id);
        });

        internalWires.forEach(w => {
            const newFrom = idMap.get(w.fromNode);
            const newTo = idMap.get(w.toNode);
            if (newFrom && newTo) {
                wires.push({
                    fromNode: newFrom,
                    toNode: newTo,
                    toPin: 0
                });
            }
        });
    }

    selectedNodeIds = newSelection;
    updateStats();
    showToast(`ทำซ้ำ ${baseNodes.length} ชิ้น x ${repeatCount} ชุดแล้ว`);
}

canvas.addEventListener('dblclick', (e) => {
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = screenToWorld(sx, sy);

    const clickedNode = findNodeAt(world.x, world.y);
    if (clickedNode && clickedNode.type === 'CLOCK') {
        const currentSec = (clickedNode.intervalMs / 1000).toString();
        const input = prompt('ตั้งเวลาการสลับสัญญาณ CLOCK (หน่วย: วินาที เช่น 0.2, 0.5, 1, 2):', currentSec);
        if (input !== null) {
            const sec = parseFloat(input);
            if (!isNaN(sec) && sec >= 0.05 && sec <= 60) {
                clickedNode.intervalMs = sec * 1000;
            } else {
                showToast('กรุณากรอกตัวเลขระหว่าง 0.05 ถึง 60 วินาที');
            }
        }
    }
});

canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    mouseScreen = { x: sx, y: sy };
    mouseWorld = screenToWorld(sx, sy);

    if (e.button === 1 || (e.button === 0 && isSpacePressed)) {
        e.preventDefault();
        isPanning = true;
        panStartScreen = { x: sx, y: sy };
        panStartCamera = { x: camera.x, y: camera.y };
        return;
    }

    if (e.button === 2) {
        const pin = findPinAt(mouseWorld.x, mouseWorld.y);
        if (pin) {
            wires = wires.filter(w => !(
                (pin.isOutput && w.fromNode === pin.nodeId) ||
                (!pin.isOutput && w.toNode === pin.nodeId && (w.toPin || 0) === pin.pinIndex)
            ));
            updateStats();
            return;
        }
        const clickedNode = findNodeAt(mouseWorld.x, mouseWorld.y);
        if (clickedNode) {
            selectedNodeIds.delete(clickedNode.id);
            nodes = nodes.filter(n => n.id !== clickedNode.id);
            wires = wires.filter(w => w.fromNode !== clickedNode.id && w.toNode !== clickedNode.id);
            updateStats();
        }
        return;
    }

    const pin = findPinAt(mouseWorld.x, mouseWorld.y);
    if (pin && pin.isOutput) {
        wiringStart = pin;
        return;
    }

    const clickedNode = findNodeAt(mouseWorld.x, mouseWorld.y);
    const multiKey = e.shiftKey || e.ctrlKey || e.metaKey;

    if (clickedNode) {
        if (multiKey) {
            if (selectedNodeIds.has(clickedNode.id)) {
                selectedNodeIds.delete(clickedNode.id);
            } else {
                selectedNodeIds.add(clickedNode.id);
            }
            updateStats();
        } else if (!selectedNodeIds.has(clickedNode.id)) {
            selectedNodeIds.clear();
            selectedNodeIds.add(clickedNode.id);
            updateStats();
        }

        const centerDist = Math.hypot(mouseWorld.x - (clickedNode.x + clickedNode.w / 2), mouseWorld.y - (clickedNode.y + clickedNode.h / 2));

        if (!multiKey && clickedNode.type === 'SWITCH' && centerDist <= 18) {
            clickedNode.state = !clickedNode.state;
            return;
        }

        if (!multiKey && clickedNode.type === 'BUTTON' && centerDist <= 24) {
            clickedNode.state = true;
            activePushButton = clickedNode;
            return;
        }

        draggingNodes = [];
        selectedNodeIds.forEach(id => {
            const n = nodes.find(item => item.id === id);
            if (n) {
                draggingNodes.push({
                    node: n,
                    offsetX: mouseWorld.x - n.x,
                    offsetY: mouseWorld.y - n.y
                });
            }
        });
    } else {
        if (!multiKey) {
            selectedNodeIds.clear();
            updateStats();
        }
        selectionBox = {
            startX: mouseWorld.x,
            startY: mouseWorld.y,
            currentX: mouseWorld.x,
            currentY: mouseWorld.y
        };
    }
});

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    mouseScreen = { x: sx, y: sy };
    mouseWorld = screenToWorld(sx, sy);

    if (isPanning) {
        camera.x = panStartCamera.x + (sx - panStartScreen.x);
        camera.y = panStartCamera.y + (sy - panStartScreen.y);
        return;
    }

    hoveredPin = findPinAt(mouseWorld.x, mouseWorld.y);

    if (draggingNodes.length > 0) {
        draggingNodes.forEach(item => {
            item.node.x = mouseWorld.x - item.offsetX;
            item.node.y = mouseWorld.y - item.offsetY;
        });
    } else if (selectionBox) {
        selectionBox.currentX = mouseWorld.x;
        selectionBox.currentY = mouseWorld.y;
    }
});

window.addEventListener('mouseup', (e) => {
    if (isPanning) {
        isPanning = false;
    }

    if (activePushButton) {
        activePushButton.state = false;
        activePushButton = null;
    }

    if (wiringStart) {
        const rect = canvas.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        const world = screenToWorld(sx, sy);
        const targetPin = findPinAt(world.x, world.y);

        if (targetPin && !targetPin.isOutput && targetPin.nodeId !== wiringStart.nodeId) {
            const alreadyExists = wires.some(w =>
                w.fromNode === wiringStart.nodeId &&
                w.toNode === targetPin.nodeId &&
                (w.toPin || 0) === targetPin.pinIndex
            );
            if (!alreadyExists) {
                wires.push({
                    fromNode: wiringStart.nodeId,
                    toNode: targetPin.nodeId,
                    toPin: 0
                });
                updateStats();
            }
        }
        wiringStart = null;
    }

    if (selectionBox) {
        const minX = Math.min(selectionBox.startX, selectionBox.currentX);
        const maxX = Math.max(selectionBox.startX, selectionBox.currentX);
        const minY = Math.min(selectionBox.startY, selectionBox.currentY);
        const maxY = Math.max(selectionBox.startY, selectionBox.currentY);

        if (maxX - minX > 4 / camera.zoom || maxY - minY > 4 / camera.zoom) {
            nodes.forEach(n => {
                const overlaps = n.x + n.w >= minX && n.x <= maxX && n.y + n.h >= minY && n.y <= maxY;
                if (overlaps) {
                    selectedNodeIds.add(n.id);
                }
            });
            updateStats();
        }
        selectionBox = null;
    }

    draggingNodes = [];
});

canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.12 : 0.89;
    setZoom(camera.zoom * factor, sx, sy);
}, { passive: false });

canvas.addEventListener('contextmenu', e => e.preventDefault());

document.getElementById('zoomInBtn').addEventListener('click', () => {
    setZoom(camera.zoom * 1.15);
});
document.getElementById('zoomOutBtn').addEventListener('click', () => {
    setZoom(camera.zoom / 1.15);
});
zoomResetBtn.addEventListener('click', resetCamera);

window.addEventListener('keydown', (e) => {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    if (e.code === 'Space') {
        isSpacePressed = true;
        container.classList.add('panning');
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeIds.size > 0) {
            e.preventDefault();
            deleteSelectedNodes();
        }
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        if (selectedNodeIds.size > 0) {
            e.preventDefault();
            duplicateSelectedNodes(dupCountInput.value);
        }
    }
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
        isSpacePressed = false;
        isPanning = false;
        container.classList.remove('panning');
    }
});

document.getElementById('duplicateBtn').addEventListener('click', () => {
    duplicateSelectedNodes(dupCountInput.value);
});

document.getElementById('deleteSelectedBtn').addEventListener('click', () => {
    deleteSelectedNodes();
});

document.querySelectorAll('.comp-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const type = btn.getAttribute('data-type');
        const created = addNode(type);
        selectedNodeIds.clear();
        selectedNodeIds.add(created.id);
        updateStats();
    });
});

document.getElementById('clearBtn').addEventListener('click', () => {
    nodes = [];
    wires = [];
    selectedNodeIds.clear();
    nextId = 1;
    updateStats();
    showToast('ล้างกระดานแล้ว');
});

function refreshSlotIndicators() {
    document.querySelectorAll('.slot-group').forEach(group => {
        const slotNum = group.getAttribute('data-slot');
        const savedData = localStorage.getItem(`logicSandbox_slot_${slotNum}`);
        group.classList.toggle('has-data', Boolean(savedData));
        group.classList.toggle('active-slot', activeSlot === slotNum);
    });
}

function showToast(msg) {
    saveToast.innerText = msg;
    saveToast.classList.add('show');
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => saveToast.classList.remove('show'), 2000);
}

document.querySelectorAll('.slot-save').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const slotNum = e.target.closest('.slot-group').getAttribute('data-slot');
        const payload = JSON.stringify({ nodes, wires, nextId, camera });
        localStorage.setItem(`logicSandbox_slot_${slotNum}`, payload);
        activeSlot = slotNum;
        refreshSlotIndicators();
        showToast(`บันทึกช่อง ${slotNum} สำเร็จ!`);
    });
});

document.querySelectorAll('.slot-load').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const slotNum = e.target.closest('.slot-group').getAttribute('data-slot');
        const raw = localStorage.getItem(`logicSandbox_slot_${slotNum}`);
        if (!raw) {
            showToast(`ช่อง ${slotNum} ยังว่างอยู่`);
            return;
        }
        const parsed = JSON.parse(raw);
        nodes = (parsed.nodes || []).map(n => ({
            ...n,
            inputs: Array(GATE_SPECS[n.type]?.inputs ?? 1).fill(false)
        }));
        wires = (parsed.wires || []).map(w => ({
            fromNode: w.fromNode,
            toNode: w.toNode,
            toPin: 0
        }));
        nextId = parsed.nextId || 1;
        if (parsed.camera) {
            camera = { ...camera, ...parsed.camera };
            zoomResetBtn.innerText = `${Math.round(camera.zoom * 100)}%`;
        }
        selectedNodeIds.clear();
        activeSlot = slotNum;
        updateStats();
        refreshSlotIndicators();
        showToast(`โหลดช่อง ${slotNum} แล้ว`);
    });
});

function updateStats() {
    statsText.innerText = `NODES: ${nodes.length} | WIRES: ${wires.length}`;
    selectedCountEl.innerText = `เลือก: ${selectedNodeIds.size}`;
}

refreshSlotIndicators();
updateStats();
requestAnimationFrame(renderLoop);