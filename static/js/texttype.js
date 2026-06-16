export class TextType {
    constructor(element, options = {}) {
        this.container = typeof element === 'string' ? document.querySelector(element) : element;
        if (!this.container) return;

        this.text = options.text || ['Text typing effect'];
        if (!Array.isArray(this.text)) this.text = [this.text];
        
        this.typingSpeed = options.typingSpeed || 50;
        this.initialDelay = options.initialDelay || 0;
        this.pauseDuration = options.pauseDuration || 2000;
        this.deletingSpeed = options.deletingSpeed || 30;
        this.loop = options.loop !== undefined ? options.loop : true;
        this.showCursor = options.showCursor !== undefined ? options.showCursor : true;
        this.cursorCharacter = options.cursorCharacter || '|';
        
        this.currentTextIndex = 0;
        this.currentCharIndex = 0;
        this.isDeleting = false;
        this.displayedText = '';
        this.timeout = null;
        
        this.init();
    }
    
    init() {
        this.container.innerHTML = '';
        this.container.classList.add('text-type');
        
        this.contentSpan = document.createElement('span');
        this.contentSpan.className = 'text-type__content';
        this.container.appendChild(this.contentSpan);
        
        if (this.showCursor) {
            this.cursorSpan = document.createElement('span');
            this.cursorSpan.className = 'text-type__cursor';
            this.cursorSpan.innerHTML = this.cursorCharacter;
            this.container.appendChild(this.cursorSpan);
            
            // Add CSS for blinking cursor
            if (!document.getElementById('text-type-css')) {
                const style = document.createElement('style');
                style.id = 'text-type-css';
                style.textContent = `
                    .text-type { display: inline-block; white-space: pre-wrap; }
                    .text-type__cursor { margin-left: 0.1rem; display: inline-block; animation: textTypeBlink 0.8s infinite; color: inherit; font-weight: 300;}
                    @keyframes textTypeBlink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
                `;
                document.head.appendChild(style);
            }
        }
        
        setTimeout(() => this.type(), this.initialDelay);
    }
    
    type() {
        const currentFullText = this.text[this.currentTextIndex];
        
        if (this.isDeleting) {
            this.displayedText = currentFullText.substring(0, this.currentCharIndex - 1);
            this.currentCharIndex--;
        } else {
            this.displayedText = currentFullText.substring(0, this.currentCharIndex + 1);
            this.currentCharIndex++;
        }
        
        this.contentSpan.innerHTML = this.displayedText;
        
        let typeSpeed = this.isDeleting ? this.deletingSpeed : this.typingSpeed;
        
        if (!this.isDeleting && this.displayedText === currentFullText) {
            if (!this.loop && this.currentTextIndex === this.text.length - 1) {
                // Done typing and no loop
                this.cursorSpan.style.display = 'none';
                return;
            }
            typeSpeed = this.pauseDuration;
            this.isDeleting = true;
        } else if (this.isDeleting && this.displayedText === '') {
            this.isDeleting = false;
            this.currentTextIndex = (this.currentTextIndex + 1) % this.text.length;
            typeSpeed = 500; // Brief pause before starting next word
        }
        
        this.timeout = setTimeout(() => this.type(), typeSpeed);
    }
    
    destroy() {
        clearTimeout(this.timeout);
        this.container.innerHTML = '';
    }
}
