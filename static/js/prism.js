import { Renderer, Triangle, Program, Mesh } from 'https://unpkg.com/ogl@1.0.11/src/index.js';

export class PrismBackground {
    constructor(container, options = {}) {
        this.container = container;
        this.height = options.height || 3.5;
        this.baseWidth = options.baseWidth || 5.5;
        this.animationType = options.animationType || 'rotate';
        this.glow = options.glow || 1;
        this.offset = options.offset || { x: 0, y: 0 };
        this.noise = options.noise !== undefined ? options.noise : 0.5;
        this.transparent = options.transparent !== undefined ? options.transparent : true;
        this.scale = options.scale || 3.6;
        this.hueShift = options.hueShift || 0;
        this.colorFrequency = options.colorFrequency || 1;
        this.hoverStrength = options.hoverStrength || 2;
        this.inertia = options.inertia || 0.05;
        this.bloom = options.bloom || 1;
        this.suspendWhenOffscreen = options.suspendWhenOffscreen || false;
        this.timeScale = options.timeScale !== undefined ? options.timeScale : 0.5;

        this.init();
    }

    init() {
        const H = Math.max(0.001, this.height);
        const BW = Math.max(0.001, this.baseWidth);
        const BASE_HALF = BW * 0.5;
        const GLOW = Math.max(0.0, this.glow);
        const NOISE = Math.max(0.0, this.noise);
        const offX = this.offset?.x ?? 0;
        const offY = this.offset?.y ?? 0;
        const SAT = this.transparent ? 1.5 : 1;
        const SCALE = Math.max(0.001, this.scale);
        const HUE = this.hueShift || 0;
        const CFREQ = Math.max(0.0, this.colorFrequency || 1);
        const BLOOM = Math.max(0.0, this.bloom || 1);
        const RSX = 1;
        const RSY = 1;
        const RSZ = 1;
        const TS = Math.max(0, this.timeScale || 1);
        const HOVSTR = Math.max(0, this.hoverStrength || 1);
        const INERT = Math.max(0, Math.min(1, this.inertia || 0.12));

        const dpr = Math.min(2, window.devicePixelRatio || 1);
        this.renderer = new Renderer({
            dpr,
            alpha: this.transparent,
            antialias: false
        });
        const gl = this.renderer.gl;
        this.gl = gl;
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.CULL_FACE);
        gl.disable(gl.BLEND);

        Object.assign(gl.canvas.style, {
            position: 'absolute',
            inset: '0',
            width: '100%',
            height: '100%',
            display: 'block'
        });
        this.container.appendChild(gl.canvas);

        const vertex = /* glsl */ `
            attribute vec2 position;
            void main() {
                gl_Position = vec4(position, 0.0, 1.0);
            }
        `;

        const fragment = /* glsl */ `
            precision highp float;

            uniform vec2  iResolution;
            uniform float iTime;

            uniform float uHeight;
            uniform float uBaseHalf;
            uniform mat3  uRot;
            uniform int   uUseBaseWobble;
            uniform float uGlow;
            uniform vec2  uOffsetPx;
            uniform float uNoise;
            uniform float uSaturation;
            uniform float uScale;
            uniform float uHueShift;
            uniform float uColorFreq;
            uniform float uBloom;
            uniform float uCenterShift;
            uniform float uInvBaseHalf;
            uniform float uInvHeight;
            uniform float uMinAxis;
            uniform float uPxScale;
            uniform float uTimeScale;

            vec4 tanh4(vec4 x){
                vec4 e2x = exp(2.0*x);
                return (e2x - 1.0) / (e2x + 1.0);
            }

            float rand(vec2 co){
                return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453123);
            }

            float sdOctaAnisoInv(vec3 p){
                vec3 q = vec3(abs(p.x) * uInvBaseHalf, abs(p.y) * uInvHeight, abs(p.z) * uInvBaseHalf);
                float m = q.x + q.y + q.z - 1.0;
                return m * uMinAxis * 0.5773502691896258;
            }

            float sdPyramidUpInv(vec3 p){
                float oct = sdOctaAnisoInv(p);
                float halfSpace = -p.y;
                return max(oct, halfSpace);
            }

            mat3 hueRotation(float a){
                float c = cos(a), s = sin(a);
                mat3 W = mat3(
                    0.299, 0.587, 0.114,
                    0.299, 0.587, 0.114,
                    0.299, 0.587, 0.114
                );
                mat3 U = mat3(
                     0.701, -0.587, -0.114,
                    -0.299,  0.413, -0.114,
                    -0.300, -0.588,  0.886
                );
                mat3 V = mat3(
                     0.168, -0.331,  0.500,
                     0.328,  0.035, -0.500,
                    -0.497,  0.296,  0.201
                );
                return W + U * c + V * s;
            }

            void main(){
                vec2 f = (gl_FragCoord.xy - 0.5 * iResolution.xy - uOffsetPx) * uPxScale;

                float z = 5.0;
                float d = 0.0;

                vec3 p;
                vec4 o = vec4(0.0);

                float centerShift = uCenterShift;
                float cf = uColorFreq;

                mat2 wob = mat2(1.0);
                if (uUseBaseWobble == 1) {
                    float t = iTime * uTimeScale;
                    float c0 = cos(t + 0.0);
                    float c1 = cos(t + 33.0);
                    float c2 = cos(t + 11.0);
                    wob = mat2(c0, c1, c2, c0);
                }

                const int STEPS = 100;
                for (int i = 0; i < STEPS; i++) {
                    p = vec3(f, z);
                    p.xz = p.xz * wob;
                    p = uRot * p;
                    vec3 q = p;
                    q.y += centerShift;
                    d = 0.1 + 0.2 * abs(sdPyramidUpInv(q));
                    z -= d;
                    o += (sin((p.y + z) * cf + vec4(0.0, 1.0, 2.0, 3.0)) + 1.0) / d;
                }

                o = tanh4(o * o * (uGlow * uBloom) / 1e5);

                vec3 col = o.rgb;
                float n = rand(gl_FragCoord.xy + vec2(iTime));
                col += (n - 0.5) * uNoise;
                col = clamp(col, 0.0, 1.0);

                float L = dot(col, vec3(0.2126, 0.7152, 0.0722));
                col = clamp(mix(vec3(L), col, uSaturation), 0.0, 1.0);

                if(abs(uHueShift) > 0.0001){
                    col = clamp(hueRotation(uHueShift) * col, 0.0, 1.0);
                }

                gl_FragColor = vec4(col, o.a);
            }
        `;

        const geometry = new Triangle(gl);
        this.iResBuf = new Float32Array(2);
        this.offsetPxBuf = new Float32Array(2);

        this.program = new Program(gl, {
            vertex,
            fragment,
            uniforms: {
                iResolution: { value: this.iResBuf },
                iTime: { value: 0 },
                uHeight: { value: H },
                uBaseHalf: { value: BASE_HALF },
                uUseBaseWobble: { value: 1 },
                uRot: { value: new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]) },
                uGlow: { value: GLOW },
                uOffsetPx: { value: this.offsetPxBuf },
                uNoise: { value: NOISE },
                uSaturation: { value: SAT },
                uScale: { value: SCALE },
                uHueShift: { value: HUE },
                uColorFreq: { value: CFREQ },
                uBloom: { value: BLOOM },
                uCenterShift: { value: H * 0.25 },
                uInvBaseHalf: { value: 1 / BASE_HALF },
                uInvHeight: { value: 1 / H },
                uMinAxis: { value: Math.min(BASE_HALF, H) },
                uPxScale: {
                    value: 1 / ((gl.drawingBufferHeight || 1) * 0.1 * SCALE)
                },
                uTimeScale: { value: TS }
            }
        });
        this.mesh = new Mesh(gl, { geometry, program: this.program });

        this.resize = () => {
            const w = this.container.clientWidth || 1;
            const h = this.container.clientHeight || 1;
            this.renderer.setSize(w, h);
            this.iResBuf[0] = gl.drawingBufferWidth;
            this.iResBuf[1] = gl.drawingBufferHeight;
            this.offsetPxBuf[0] = offX * dpr;
            this.offsetPxBuf[1] = offY * dpr;
            this.program.uniforms.uPxScale.value = 1 / ((gl.drawingBufferHeight || 1) * 0.1 * SCALE);
        };
        this.ro = new ResizeObserver(this.resize);
        this.ro.observe(this.container);
        this.resize();

        this.rotBuf = new Float32Array(9);
        this.setMat3FromEuler = (yawY, pitchX, rollZ, out) => {
            const cy = Math.cos(yawY), sy = Math.sin(yawY);
            const cx = Math.cos(pitchX), sx = Math.sin(pitchX);
            const cz = Math.cos(rollZ), sz = Math.sin(rollZ);
            const r00 = cy * cz + sy * sx * sz;
            const r01 = -cy * sz + sy * sx * cz;
            const r02 = sy * cx;

            const r10 = cx * sz;
            const r11 = cx * cz;
            const r12 = -sx;

            const r20 = -sy * cz + cy * sx * sz;
            const r21 = sy * sz + cy * sx * cz;
            const r22 = cy * cx;

            out[0] = r00; out[1] = r10; out[2] = r20;
            out[3] = r01; out[4] = r11; out[5] = r21;
            out[6] = r02; out[7] = r12; out[8] = r22;
            return out;
        };

        const NOISE_IS_ZERO = NOISE < 1e-6;
        this.raf = 0;
        this.t0 = performance.now();
        this.TS = TS;
        this.RSX = RSX;
        this.RSY = RSY;
        this.RSZ = RSZ;
        this.HOVSTR = HOVSTR;
        this.INERT = INERT;
        this.NOISE_IS_ZERO = NOISE_IS_ZERO;

        const rnd = () => Math.random();
        this.wX = (0.3 + rnd() * 0.6) * RSX;
        this.wY = (0.2 + rnd() * 0.7) * RSY;
        this.wZ = (0.1 + rnd() * 0.5) * RSZ;
        this.phX = rnd() * Math.PI * 2;
        this.phZ = rnd() * Math.PI * 2;

        this.yaw = 0; this.pitch = 0; this.roll = 0;
        this.targetYaw = 0; this.targetPitch = 0;
        this.lerp = (a, b, t) => a + (b - a) * t;

        this.pointer = { x: 0, y: 0, inside: true };
        this.onMove = e => {
            const ww = Math.max(1, window.innerWidth);
            const wh = Math.max(1, window.innerHeight);
            const cx = ww * 0.5;
            const cy = wh * 0.5;
            const nx = (e.clientX - cx) / (ww * 0.5);
            const ny = (e.clientY - cy) / (wh * 0.5);
            this.pointer.x = Math.max(-1, Math.min(1, nx));
            this.pointer.y = Math.max(-1, Math.min(1, ny));
            this.pointer.inside = true;
        };
        this.onLeave = () => { this.pointer.inside = false; };
        this.onBlur = () => { this.pointer.inside = false; };

        if (this.animationType === 'hover') {
            this.onPointerMove = e => {
                this.onMove(e);
                this.startRAF();
            };
            window.addEventListener('pointermove', this.onPointerMove, { passive: true });
            window.addEventListener('mouseleave', this.onLeave);
            window.addEventListener('blur', this.onBlur);
            this.program.uniforms.uUseBaseWobble.value = 0;
        } else if (this.animationType === '3drotate') {
            this.program.uniforms.uUseBaseWobble.value = 0;
        } else {
            this.program.uniforms.uUseBaseWobble.value = 1;
        }

        if (this.suspendWhenOffscreen) {
            this.io = new IntersectionObserver(entries => {
                const vis = entries.some(e => e.isIntersecting);
                if (vis) this.startRAF();
                else this.stopRAF();
            });
            this.io.observe(this.container);
            this.startRAF();
        } else {
            this.startRAF();
        }
    }

    startRAF() {
        if (this.raf) return;
        this.raf = requestAnimationFrame((t) => this.render(t));
    }

    stopRAF() {
        if (!this.raf) return;
        cancelAnimationFrame(this.raf);
        this.raf = 0;
    }

    render(t) {
        const time = (t - this.t0) * 0.001;
        this.program.uniforms.iTime.value = time;

        let continueRAF = true;

        if (this.animationType === 'hover') {
            const maxPitch = 0.6 * this.HOVSTR;
            const maxYaw = 0.6 * this.HOVSTR;
            this.targetYaw = (this.pointer.inside ? -this.pointer.x : 0) * maxYaw;
            this.targetPitch = (this.pointer.inside ? this.pointer.y : 0) * maxPitch;
            const prevYaw = this.yaw;
            const prevPitch = this.pitch;
            const prevRoll = this.roll;
            this.yaw = this.lerp(prevYaw, this.targetYaw, this.INERT);
            this.pitch = this.lerp(prevPitch, this.targetPitch, this.INERT);
            this.roll = this.lerp(prevRoll, 0, 0.1);
            this.program.uniforms.uRot.value = this.setMat3FromEuler(this.yaw, this.pitch, this.roll, this.rotBuf);

            if (this.NOISE_IS_ZERO) {
                const settled = Math.abs(this.yaw - this.targetYaw) < 1e-4 && Math.abs(this.pitch - this.targetPitch) < 1e-4 && Math.abs(this.roll) < 1e-4;
                if (settled) continueRAF = false;
            }
        } else if (this.animationType === '3drotate') {
            const tScaled = time * this.TS;
            this.yaw = tScaled * this.wY;
            this.pitch = Math.sin(tScaled * this.wX + this.phX) * 0.6;
            this.roll = Math.sin(tScaled * this.wZ + this.phZ) * 0.5;
            this.program.uniforms.uRot.value = this.setMat3FromEuler(this.yaw, this.pitch, this.roll, this.rotBuf);
            if (this.TS < 1e-6) continueRAF = false;
        } else {
            this.rotBuf[0] = 1; this.rotBuf[1] = 0; this.rotBuf[2] = 0;
            this.rotBuf[3] = 0; this.rotBuf[4] = 1; this.rotBuf[5] = 0;
            this.rotBuf[6] = 0; this.rotBuf[7] = 0; this.rotBuf[8] = 1;
            this.program.uniforms.uRot.value = this.rotBuf;
            if (this.TS < 1e-6) continueRAF = false;
        }

        this.renderer.render({ scene: this.mesh });
        if (continueRAF) {
            this.raf = requestAnimationFrame((t) => this.render(t));
        } else {
            this.raf = 0;
        }
    }

    destroy() {
        this.stopRAF();
        if (this.ro) this.ro.disconnect();
        if (this.animationType === 'hover') {
            if (this.onPointerMove) window.removeEventListener('pointermove', this.onPointerMove);
            window.removeEventListener('mouseleave', this.onLeave);
            window.removeEventListener('blur', this.onBlur);
        }
        if (this.suspendWhenOffscreen && this.io) {
            this.io.disconnect();
        }
        if (this.gl && this.gl.canvas.parentElement === this.container) {
            this.container.removeChild(this.gl.canvas);
        }
    }
}
