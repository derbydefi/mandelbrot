//code by derby
document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("backgroundCanvas");
    const ctx = canvas.getContext("2d");
    const offscreenCanvas = document.createElement("canvas");
    const offscreenCtx = offscreenCanvas.getContext("2d");
    const stats = document.getElementById("stats");
    const savedCoordsContainer = document.getElementById("savedCoords");
    const toggleControlsBtn = document.getElementById("toggleControls");
    const toggleHelpBtn = document.getElementById("toggleHelp");
    const closeHelpBtn = document.getElementById("closeHelp");
    const controls = document.getElementById("controls");
    const helpMenu = document.getElementById("helpMenu");
    const colorShiftCheckbox = document.getElementById("colorShift");
    const addCoordButton = document.getElementById("addCoordButton");
    const addCoordForm = document.getElementById("addCoordForm");
    const closeAddCoord = document.getElementById("closeAddCoord");
    const saveInputCoord = document.getElementById("saveInputCoord");
    const inputZoom = document.getElementById("inputZoom");
    const inputOffsetX = document.getElementById("inputOffsetX");
    const inputOffsetY = document.getElementById("inputOffsetY");

    let zoom = 1;
    let offsetX = -0.743643887037151;
    let offsetY = 0.13182990420533;
    let isDragging = false;
    let dragStartX, dragStartY;
    let colorShift = 0;
    let animationFrameId;
    let autoZoom = false; // Auto Zoom default is off
    let colorShifting = true; // Color shifting default is on

    let savedCoords = JSON.parse(localStorage.getItem("savedCoords")) || [
        {
            zoom: 1,
            offsetX: -0.743643887037151,
            offsetY: 0.13182990420533,
            id: "home",
        },
    ];

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        offscreenCanvas.width = canvas.width;
        offscreenCanvas.height = canvas.height;
    }

    function startMandelbrot() {
        resizeCanvas();
        window.addEventListener("resize", resizeCanvas);
        drawMandelbrot();
    }

    function drawMandelbrot() {
        offscreenCtx.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);

        const width = offscreenCanvas.width;
        const height = offscreenCanvas.height;
        const imageData = offscreenCtx.createImageData(width, height);

        const baseIterationLimit = parseInt(
            document.getElementById("baseIterationLimit").value,
            10
        );
        const zoomFactor = parseFloat(document.getElementById("zoomFactor").value);
        let pixelSkip = parseInt(document.getElementById("pixelSkip").value, 10);
        const dithering = document.getElementById("dithering").checked;
        const orbitTrap = document.getElementById("orbitTrap").checked;

        if (isNaN(pixelSkip) || pixelSkip < 1) {
            pixelSkip = 1; // Ensure pixelSkip is at least 1
        }

        if (autoZoom) {
            zoom *= zoomFactor;
        }

        const iterationLimit = Math.floor(baseIterationLimit * Math.log(zoom)) + 50;
        if (colorShifting) {
            colorShift = (colorShift + 1) % 360;
        }

        const xStart = -width / 2;
        const yStart = -height / 2;

        for (let x = 0; x < width; x += pixelSkip) {
            for (let y = 0; y < height; y += pixelSkip) {
                const cx = (x + xStart) / (0.5 * zoom * width) + offsetX;
                const cy = (y + yStart) / (0.5 * zoom * height) + offsetY;

                let zx = 0;
                let zy = 0;
                let iter = 0;
                let minDistance = 1e20;
                let trapX = zx;
                let trapY = zy;

                while (zx * zx + zy * zy < 4 && iter < iterationLimit) {
                    const xtemp = zx * zx - zy * zy + cx;
                    zy = 2.0 * zx * zy + cy;
                    zx = xtemp;
                    iter++;

                    const distance = Math.sqrt(zx * zx + zy * zy);
                    if (distance < minDistance) {
                        minDistance = distance;
                        trapX = zx;
                        trapY = zy;
                    }
                }

                const pixelIndex = (x + y * width) * 4;
                let r, g, b;

                if (orbitTrap) {
                    const orbitTrapDistance = Math.sqrt(
                        (trapX - cx) ** 2 + (trapY - cy) ** 2
                    );
                    r = Math.floor(255 * (1 - orbitTrapDistance));
                    g = Math.floor(255 * orbitTrapDistance);
                    b = 128;
                } else {
                    const hue = (iter * 5 + colorShift) % 360;
                    const lightness = Math.min(1, 0.5 + minDistance / 4);
                    [r, g, b] = hslToRgb(hue / 360, 1 - minDistance / 4, lightness);
                }

                if (dithering) {
                    const dither = (Math.random() * 32 - 16) | 0;
                    imageData.data[pixelIndex] = r + dither;
                    imageData.data[pixelIndex + 1] = g + dither;
                    imageData.data[pixelIndex + 2] = b + dither;
                } else {
                    imageData.data[pixelIndex] = r;
                    imageData.data[pixelIndex + 1] = g;
                    imageData.data[pixelIndex + 2] = b;
                }
                imageData.data[pixelIndex + 3] = 255;

                // Fill in skipped pixels
                for (let i = 0; i < pixelSkip; i++) {
                    for (let j = 0; j < pixelSkip; j++) {
                        if (x + i < width && y + j < height) {
                            const fillPixelIndex = (x + i + (y + j) * width) * 4;
                            imageData.data[fillPixelIndex] = imageData.data[pixelIndex];
                            imageData.data[fillPixelIndex + 1] =
                                imageData.data[pixelIndex + 1];
                            imageData.data[fillPixelIndex + 2] =
                                imageData.data[pixelIndex + 2];
                            imageData.data[fillPixelIndex + 3] =
                                imageData.data[pixelIndex + 3];
                        }
                    }
                }
            }
        }

        offscreenCtx.putImageData(imageData, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.imageSmoothingEnabled = true; // Disable image smoothing to keep the pixelated effect
        ctx.drawImage(offscreenCanvas, 0, 0, canvas.width, canvas.height);

        // Update HUD
        stats.innerHTML = `Zoom: ${zoom.toFixed(5)}<br>OffsetX: ${offsetX.toFixed(
            15
        )}<br>OffsetY: ${offsetY.toFixed(15)}`;

        animationFrameId = requestAnimationFrame(drawMandelbrot);
    }

    function hslToRgb(h, s, l) {
        let r, g, b;
        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1 / 6) return p + (q - p) * 6 * t;
                if (t < 1 / 2) return q;
                if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                return p;
            };
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1 / 3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1 / 3);
        }
        return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    }

    function zoomAndPan(event) {
        const zoomFactor = parseFloat(document.getElementById("zoomFactor").value);
        const rect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        const mouseXRelative = (mouseX / canvas.width - 0.5) * 2;
        const mouseYRelative = (mouseY / canvas.height - 0.5) * 2;

        const prevZoom = zoom;
        if (event.deltaY < 0) {
            zoom *= zoomFactor;
        } else {
            zoom /= zoomFactor;
        }

        offsetX += mouseXRelative * (1 / prevZoom - 1 / zoom);
        offsetY += mouseYRelative * (1 / prevZoom - 1 / zoom);
    }

    function startDrag(event) {
        isDragging = true;
        dragStartX = event.clientX;
        dragStartY = event.clientY;
    }

    function endDrag() {
        isDragging = false;
    }

    function drag(event) {
        if (isDragging) {
            const deltaX = event.clientX - dragStartX;
            const deltaY = event.clientY - dragStartY;
            dragStartX = event.clientX;
            dragStartY = event.clientY;

            offsetX -= deltaX / (zoom * canvas.width);
            offsetY -= deltaY / (zoom * canvas.height);
        }
    }

    function saveCoordinates() {
        const savedCoord = {
            zoom: zoom,
            offsetX: offsetX,
            offsetY: offsetY,
            id: Date.now(),
        };
        savedCoords.push(savedCoord);
        localStorage.setItem("savedCoords", JSON.stringify(savedCoords));
        updateSavedCoords();
    }

    function updateSavedCoords() {
        savedCoordsContainer.innerHTML = "";
        savedCoords.forEach((coord) => {
            const coordButton = document.createElement("button");
            coordButton.textContent = `(${coord.zoom.toFixed(
                2
            )}, ${coord.offsetX.toFixed(5)}, ${coord.offsetY.toFixed(5)})`;
            coordButton.addEventListener("click", () => goToCoordinate(coord));
            savedCoordsContainer.appendChild(coordButton);
        });
    }

    function goToCoordinate(coord) {
        zoom = coord.zoom;
        offsetX = coord.offsetX;
        offsetY = coord.offsetY;
        drawMandelbrot();
    }

    function toggleAutoZoom() {
        autoZoom = !autoZoom;
    }

    function resetSimulation() {
        zoom = 1;
        offsetX = -0.743643887037151;
        offsetY = 0.13182990420533;
        document.getElementById("baseIterationLimit").value = 10;
        document.getElementById("zoomFactor").value = 1.2;
        document.getElementById("pixelSkip").value = 1;
        document.getElementById("dithering").checked = true;
        document.getElementById("orbitTrap").checked = false;
        document.getElementById("colorShift").checked = true;
        autoZoom = false;
        colorShifting = true;
        drawMandelbrot();
    }

    document
        .getElementById("saveCoord")
        .addEventListener("click", saveCoordinates);
    document
        .getElementById("toggleAutoZoom")
        .addEventListener("click", toggleAutoZoom);
    document
        .getElementById("resetSimulation")
        .addEventListener("click", resetSimulation);
    toggleControlsBtn.addEventListener("click", () => {
        if (controls.style.display === "none") {
            controls.style.display = "flex";
            toggleControlsBtn.textContent = "Hide Controls";
        } else {
            controls.style.display = "none";
            toggleControlsBtn.textContent = "Show Controls";
        }
    });
    toggleHelpBtn.addEventListener("click", () => {
        helpMenu.style.display =
            helpMenu.style.display === "none" ? "block" : "none";
    });
    closeHelpBtn.addEventListener("click", () => {
        helpMenu.style.display = "none";
    });
    colorShiftCheckbox.addEventListener("change", () => {
        colorShifting = colorShiftCheckbox.checked;
    });
    canvas.addEventListener("wheel", zoomAndPan);
    canvas.addEventListener("mousedown", startDrag);
    canvas.addEventListener("mouseup", endDrag);
    canvas.addEventListener("mousemove", drag);

    addCoordButton.addEventListener("click", () => {
        addCoordForm.style.display = 'flex';
    });

    closeAddCoord.addEventListener("click", () => {
        addCoordForm.style.display = 'none';
    });

    saveInputCoord.addEventListener("click", () => {
        const newCoord = {
            zoom: parseFloat(inputZoom.value),
            offsetX: parseFloat(inputOffsetX.value),
            offsetY: parseFloat(inputOffsetY.value),
            id: Date.now(),
        };
        savedCoords.push(newCoord);
        localStorage.setItem("savedCoords", JSON.stringify(savedCoords));
        updateSavedCoords();
        addCoordForm.style.display = 'none';
    });

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    startMandelbrot();
    updateSavedCoords();
});
