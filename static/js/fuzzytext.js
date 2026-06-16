export class FuzzyText {
    constructor(canvasElement, options = {}) {
        this.canvas = typeof canvasElement === 'string' ? document.querySelector(canvasElement) : canvasElement;
        if (!this.canvas) return;

        this.text = options.text || '';
        this.fontSize = options.fontSize || '100px';
        this.fontWeight = options.fontWeight || 900;
        this.fontFamily = options.fontFamily || 'inherit';
        this.color = options.color || '#fff';
        this.enableHover = options.enableHover !== undefined ? options.enableHover : true;
        this.baseIntensity = options.baseIntensity || 0.18;
        this.hoverIntensity = options.hoverIntensity || 0.5;
        this.fuzzRange = options.fuzzRange || 30;
        this.fps = options.fps || 60;
        this.direction = options.direction || 'horizontal';
        this.transitionDuration = options.transitionDuration || 0;
        this.clickEffect = options.clickEffect || false;
        this.glitchMode = options.glitchMode || false;
        this.glitchInterval = options.glitchInterval || 2000;
        this.glitchDuration = options.glitchDuration || 200;
        this.gradient = options.gradient || null;
        this.letterSpacing = options.letterSpacing || 0;

        this.animationFrameId = null;
        this.isCancelled = false;
        this.glitchTimeoutId = null;
        this.glitchEndTimeoutId = null;
        this.clickTimeoutId = null;

        this.init();
    }

    async init() {
        const ctx = this.canvas.getContext('2d');
        if (!ctx) return;

        const computedFontFamily = this.fontFamily === 'inherit' ? window.getComputedStyle(this.canvas).fontFamily || 'sans-serif' : this.fontFamily;
        const fontSizeStr = typeof this.fontSize === 'number' ? `${this.fontSize}px` : this.fontSize;
        const fontString = `${this.fontWeight} ${fontSizeStr} ${computedFontFamily}`;

        try {
            await document.fonts.load(fontString);
        } catch {
            await document.fonts.ready;
        }
        if (this.isCancelled) return;

        let numericFontSize;
        if (typeof this.fontSize === 'number') {
            numericFontSize = this.fontSize;
        } else {
            const temp = document.createElement('span');
            temp.style.fontSize = this.fontSize;
            document.body.appendChild(temp);
            numericFontSize = parseFloat(window.getComputedStyle(temp).fontSize);
            document.body.removeChild(temp);
        }

        const offscreen = document.createElement('canvas');
        const offCtx = offscreen.getContext('2d');
        if (!offCtx) return;

        offCtx.font = fontString;
        offCtx.textBaseline = 'alphabetic';

        let totalWidth = 0;
        if (this.letterSpacing !== 0) {
            for (const char of this.text) {
                totalWidth += offCtx.measureText(char).width + this.letterSpacing;
            }
            totalWidth -= this.letterSpacing;
        } else {
            totalWidth = offCtx.measureText(this.text).width;
        }

        const metrics = offCtx.measureText(this.text);
        const actualLeft = metrics.actualBoundingBoxLeft ?? 0;
        const actualRight = this.letterSpacing !== 0 ? totalWidth : (metrics.actualBoundingBoxRight ?? metrics.width);
        const actualAscent = metrics.actualBoundingBoxAscent ?? numericFontSize;
        const actualDescent = metrics.actualBoundingBoxDescent ?? numericFontSize * 0.2;

        const textBoundingWidth = Math.ceil(this.letterSpacing !== 0 ? totalWidth : actualLeft + actualRight);
        const tightHeight = Math.ceil(actualAscent + actualDescent);

        const extraWidthBuffer = 10;
        const offscreenWidth = textBoundingWidth + extraWidthBuffer;

        offscreen.width = offscreenWidth;
        offscreen.height = tightHeight;

        const xOffset = extraWidthBuffer / 2;
        offCtx.font = fontString;
        offCtx.textBaseline = 'alphabetic';

        if (this.gradient && Array.isArray(this.gradient) && this.gradient.length >= 2) {
            const grad = offCtx.createLinearGradient(0, 0, offscreenWidth, 0);
            this.gradient.forEach((c, i) => grad.addColorStop(i / (this.gradient.length - 1), c));
            offCtx.fillStyle = grad;
        } else {
            offCtx.fillStyle = this.color;
        }

        if (this.letterSpacing !== 0) {
            let xPos = xOffset;
            for (const char of this.text) {
                offCtx.fillText(char, xPos, actualAscent);
                xPos += offCtx.measureText(char).width + this.letterSpacing;
            }
        } else {
            offCtx.fillText(this.text, xOffset - actualLeft, actualAscent);
        }

        const horizontalMargin = this.fuzzRange + 20;
        const verticalMargin = 0;
        this.canvas.width = offscreenWidth + horizontalMargin * 2;
        this.canvas.height = tightHeight + verticalMargin * 2;
        ctx.translate(horizontalMargin, verticalMargin);
        
        // CSS matching
        this.canvas.style.height = "1.2em";
        this.canvas.style.width = "auto";
        this.canvas.style.verticalAlign = "middle";
        // Compensate for the extra internal canvas margin so it aligns left properly
        const marginEm = horizontalMargin / numericFontSize;
        this.canvas.style.marginLeft = `-${marginEm}em`;
        this.canvas.style.marginRight = `-${marginEm}em`;

        const interactiveLeft = horizontalMargin + xOffset;
        const interactiveTop = verticalMargin;
        const interactiveRight = interactiveLeft + textBoundingWidth;
        const interactiveBottom = interactiveTop + tightHeight;

        let isHovering = false;
        let isClicking = false;
        let isGlitching = false;
        let currentIntensity = this.baseIntensity;
        let targetIntensity = this.baseIntensity;
        let lastFrameTime = 0;
        const frameDuration = 1000 / this.fps;

        const startGlitchLoop = () => {
            if (!this.glitchMode || this.isCancelled) return;
            this.glitchTimeoutId = setTimeout(() => {
                if (this.isCancelled) return;
                isGlitching = true;
                this.glitchEndTimeoutId = setTimeout(() => {
                    isGlitching = false;
                    startGlitchLoop();
                }, this.glitchDuration);
            }, this.glitchInterval);
        };

        if (this.glitchMode) startGlitchLoop();

        const run = timestamp => {
            if (this.isCancelled) return;

            if (timestamp - lastFrameTime < frameDuration) {
                this.animationFrameId = window.requestAnimationFrame(run);
                return;
            }
            lastFrameTime = timestamp;

            ctx.clearRect(
                -this.fuzzRange - 20,
                -this.fuzzRange - 10,
                offscreenWidth + 2 * (this.fuzzRange + 20),
                tightHeight + 2 * (this.fuzzRange + 10)
            );

            if (isClicking) {
                targetIntensity = 1;
            } else if (isGlitching) {
                targetIntensity = 1;
            } else if (isHovering) {
                targetIntensity = this.hoverIntensity;
            } else {
                targetIntensity = this.baseIntensity;
            }

            if (this.transitionDuration > 0) {
                const step = 1 / (this.transitionDuration / frameDuration);
                if (currentIntensity < targetIntensity) {
                    currentIntensity = Math.min(currentIntensity + step, targetIntensity);
                } else if (currentIntensity > targetIntensity) {
                    currentIntensity = Math.max(currentIntensity - step, targetIntensity);
                }
            } else {
                currentIntensity = targetIntensity;
            }

            if (this.direction === 'horizontal') {
                for (let j = 0; j < tightHeight; j++) {
                    const dx = Math.floor(currentIntensity * (Math.random() - 0.5) * this.fuzzRange);
                    ctx.drawImage(offscreen, 0, j, offscreenWidth, 1, dx, j, offscreenWidth, 1);
                }
            } else if (this.direction === 'vertical') {
                for (let i = 0; i < offscreenWidth; i++) {
                    const dy = Math.floor(currentIntensity * (Math.random() - 0.5) * this.fuzzRange);
                    ctx.drawImage(offscreen, i, 0, 1, tightHeight, i, dy, 1, tightHeight);
                }
            } else {
                for (let j = 0; j < tightHeight; j++) {
                    const dx = Math.floor(currentIntensity * (Math.random() - 0.5) * this.fuzzRange);
                    ctx.drawImage(offscreen, 0, j, offscreenWidth, 1, dx, j, offscreenWidth, 1);
                }
                const tempData = ctx.getImageData(0, 0, offscreenWidth + this.fuzzRange, tightHeight + this.fuzzRange);
                ctx.clearRect(
                    -this.fuzzRange - 20,
                    -this.fuzzRange - 10,
                    offscreenWidth + 2 * (this.fuzzRange + 20),
                    tightHeight + 2 * (this.fuzzRange + 10)
                );
                ctx.putImageData(tempData, 0, 0);
                for (let i = 0; i < offscreenWidth + this.fuzzRange; i++) {
                    const dy = Math.floor(currentIntensity * (Math.random() - 0.5) * this.fuzzRange * 0.5);
                    const colData = ctx.getImageData(i, 0, 1, tightHeight + this.fuzzRange);
                    ctx.clearRect(i, -this.fuzzRange, 1, tightHeight + 2 * this.fuzzRange);
                    ctx.putImageData(colData, i, dy);
                }
            }
            this.animationFrameId = window.requestAnimationFrame(run);
        };

        this.animationFrameId = window.requestAnimationFrame(run);

        const isInsideTextArea = (x, y) => {
            return x >= interactiveLeft && x <= interactiveRight && y >= interactiveTop && y <= interactiveBottom;
        };

        const handleMouseMove = e => {
            if (!this.enableHover) return;
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            const x = (e.clientX - rect.left) * scaleX;
            const y = (e.clientY - rect.top) * scaleY;
            isHovering = isInsideTextArea(x, y);
        };

        const handleMouseLeave = () => {
            isHovering = false;
        };

        const handleClick = () => {
            if (!this.clickEffect) return;
            isClicking = true;
            clearTimeout(this.clickTimeoutId);
            this.clickTimeoutId = setTimeout(() => {
                isClicking = false;
            }, 150);
        };

        const handleTouchMove = e => {
            if (!this.enableHover) return;
            const rect = this.canvas.getBoundingClientRect();
            const touch = e.touches[0];
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            const x = (touch.clientX - rect.left) * scaleX;
            const y = (touch.clientY - rect.top) * scaleY;
            isHovering = isInsideTextArea(x, y);
        };

        const handleTouchEnd = () => {
            isHovering = false;
        };

        if (this.enableHover) {
            this.canvas.addEventListener('mousemove', handleMouseMove);
            this.canvas.addEventListener('mouseleave', handleMouseLeave);
            this.canvas.addEventListener('touchmove', handleTouchMove, { passive: true });
            this.canvas.addEventListener('touchend', handleTouchEnd);
        }

        if (this.clickEffect) {
            this.canvas.addEventListener('click', handleClick);
        }

        this.cleanupEvents = () => {
            if (this.enableHover) {
                this.canvas.removeEventListener('mousemove', handleMouseMove);
                this.canvas.removeEventListener('mouseleave', handleMouseLeave);
                this.canvas.removeEventListener('touchmove', handleTouchMove);
                this.canvas.removeEventListener('touchend', handleTouchEnd);
            }
            if (this.clickEffect) {
                this.canvas.removeEventListener('click', handleClick);
            }
        };
    }

    destroy() {
        this.isCancelled = true;
        window.cancelAnimationFrame(this.animationFrameId);
        clearTimeout(this.glitchTimeoutId);
        clearTimeout(this.glitchEndTimeoutId);
        clearTimeout(this.clickTimeoutId);
        if (this.cleanupEvents) this.cleanupEvents();
    }
}
