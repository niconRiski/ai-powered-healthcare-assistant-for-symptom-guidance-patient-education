export class TrueFocus {
    constructor(element, options = {}) {
        this.container = typeof element === 'string' ? document.querySelector(element) : element;
        if (!this.container) return;

        this.sentence = options.sentence || 'True Focus';
        this.separator = options.separator || ' ';
        this.manualMode = options.manualMode || false;
        this.blurAmount = options.blurAmount || 5;
        this.borderColor = options.borderColor || '#00acc1';
        this.glowColor = options.glowColor || 'rgba(0, 172, 193, 0.6)';
        this.animationDuration = options.animationDuration !== undefined ? options.animationDuration : 0.5;
        this.pauseBetweenAnimations = options.pauseBetweenAnimations !== undefined ? options.pauseBetweenAnimations : 1;

        this.words = this.sentence.split(this.separator);
        this.currentIndex = 0;
        this.lastActiveIndex = 0;
        this.wordElements = [];
        this.intervalId = null;

        this.init();
    }

    init() {
        this.container.innerHTML = '';
        this.container.classList.add('focus-container');

        // Create words
        this.words.forEach((word, index) => {
            const span = document.createElement('span');
            span.className = 'focus-word';
            span.textContent = word;
            span.style.transition = `filter ${this.animationDuration}s ease`;
            span.style.setProperty('--border-color', this.borderColor);
            span.style.setProperty('--glow-color', this.glowColor);
            
            if (this.manualMode) {
                span.addEventListener('mouseenter', () => this.handleMouseEnter(index));
                span.addEventListener('mouseleave', () => this.handleMouseLeave());
            }
            
            this.wordElements.push(span);
            this.container.appendChild(span);
        });

        // Create frame
        this.frame = document.createElement('div');
        this.frame.className = 'focus-frame';
        this.frame.style.transition = `all ${this.animationDuration}s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease`;
        this.frame.style.setProperty('--border-color', this.borderColor);
        this.frame.style.setProperty('--glow-color', this.glowColor);
        this.frame.style.opacity = '0'; // hide initially

        ['top-left', 'top-right', 'bottom-left', 'bottom-right'].forEach(cornerClass => {
            const corner = document.createElement('span');
            corner.className = `corner ${cornerClass}`;
            this.frame.appendChild(corner);
        });

        this.container.appendChild(this.frame);

        // Add CSS if not exists
        if (!document.getElementById('true-focus-css')) {
            const style = document.createElement('style');
            style.id = 'true-focus-css';
            style.textContent = `
                .focus-container { position: relative; display: inline-flex; gap: 0.3em; justify-content: center; align-items: center; flex-wrap: wrap; outline: none; user-select: none; }
                .focus-word { position: relative; cursor: pointer; transition: filter 0.3s ease, color 0.3s ease; outline: none; user-select: none; color: inherit; font-family: inherit; }
                .focus-word.active { filter: blur(0px) !important; }
                .focus-frame { position: absolute; top: 0; left: 0; pointer-events: none; box-sizing: content-box; border: none; }
                .corner { position: absolute; width: 0.8rem; height: 0.8rem; border: 3px solid var(--border-color, #fff); filter: drop-shadow(0px 0px 4px var(--glow-color, rgba(255,255,255,0.6))); border-radius: 2px; transition: none; }
                .top-left { top: -8px; left: -8px; border-right: none; border-bottom: none; }
                .top-right { top: -8px; right: -8px; border-left: none; border-bottom: none; }
                .bottom-left { bottom: -8px; left: -8px; border-right: none; border-top: none; }
                .bottom-right { bottom: -8px; right: -8px; border-left: none; border-top: none; }
            `;
            document.head.appendChild(style);
        }

        // Handle resizing
        this.resizeHandler = () => this.updateFocusRect();
        window.addEventListener('resize', this.resizeHandler);

        // Start animation loop
        if (!this.manualMode) {
            this.startAutoAnimation();
        } else {
            this.updateBlur();
        }

        // Small delay to allow layout to settle before first rect calculation
        setTimeout(() => {
            this.updateFocusRect();
            this.updateBlur();
            this.frame.style.opacity = '1';
        }, 100);
    }

    startAutoAnimation() {
        this.intervalId = setInterval(() => {
            this.currentIndex = (this.currentIndex + 1) % this.words.length;
            this.updateFocusRect();
            this.updateBlur();
        }, (this.animationDuration + this.pauseBetweenAnimations) * 1000);
    }

    handleMouseEnter(index) {
        if (!this.manualMode) return;
        this.lastActiveIndex = index;
        this.currentIndex = index;
        this.updateFocusRect();
        this.updateBlur();
    }

    handleMouseLeave() {
        if (!this.manualMode) return;
        this.currentIndex = this.lastActiveIndex;
        this.updateFocusRect();
        this.updateBlur();
    }

    updateBlur() {
        this.wordElements.forEach((el, index) => {
            const isActive = index === this.currentIndex;
            if (isActive) {
                el.classList.add('active');
                el.style.filter = 'blur(0px)';
            } else {
                el.classList.remove('active');
                el.style.filter = `blur(${this.blurAmount}px)`;
            }
        });
    }

    updateFocusRect() {
        if (this.currentIndex === null || this.currentIndex === -1 || !this.wordElements[this.currentIndex]) return;

        const parentRect = this.container.getBoundingClientRect();
        const activeRect = this.wordElements[this.currentIndex].getBoundingClientRect();

        const x = activeRect.left - parentRect.left;
        const y = activeRect.top - parentRect.top;

        this.frame.style.transform = `translate(${x}px, ${y}px)`;
        this.frame.style.width = `${activeRect.width}px`;
        this.frame.style.height = `${activeRect.height}px`;
    }

    destroy() {
        clearInterval(this.intervalId);
        window.removeEventListener('resize', this.resizeHandler);
        this.container.innerHTML = '';
    }
}
