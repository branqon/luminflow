/*
 * fluid-sim.js — WebGL 2.0 Fluid Simulation Engine for Luminflow
 *
 * Adapted from Pavel Dobryakov's WebGL Fluid Simulation (MIT License)
 * https://github.com/PavelDoGreat/WebGL-Fluid-Simulation
 *
 * Copyright (c) 2017 Pavel Dobryakov (original)
 * Ported to WebGL 2.0 / GLSL 300 es and restructured as a reusable class.
 *
 * MIT License — see original repo for full license text.
 */

'use strict';

// ---------------------------------------------------------------------------
// Shader sources (GLSL 300 es)
// ---------------------------------------------------------------------------

const baseVertexShaderSource = `#version 300 es
precision highp float;

in vec2 aPosition;
out vec2 vUv;
out vec2 vL;
out vec2 vR;
out vec2 vT;
out vec2 vB;
uniform vec2 texelSize;

void main () {
    vUv = aPosition * 0.5 + 0.5;
    vL = vUv - vec2(texelSize.x, 0.0);
    vR = vUv + vec2(texelSize.x, 0.0);
    vT = vUv + vec2(0.0, texelSize.y);
    vB = vUv - vec2(0.0, texelSize.y);
    gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const splatShaderSource = `#version 300 es
precision highp float;
precision highp sampler2D;

in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uTarget;
uniform float aspectRatio;
uniform vec3 color;
uniform vec2 point;
uniform float radius;

void main () {
    vec2 p = vUv - point.xy;
    p.x *= aspectRatio;
    vec3 splat = exp(-dot(p, p) / radius) * color;
    vec3 base = texture(uTarget, vUv).xyz;
    fragColor = vec4(base + splat, 1.0);
}
`;

const advectionShaderSource = `#version 300 es
precision highp float;
precision highp sampler2D;

in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform vec2 texelSize;
uniform float dt;
uniform float dissipation;

void main () {
    vec2 coord = vUv - dt * texture(uVelocity, vUv).xy * texelSize;
    vec4 result = texture(uSource, coord);
    float decay = 1.0 + dissipation * dt;
    fragColor = result / decay;
}
`;

const divergenceShaderSource = `#version 300 es
precision mediump float;
precision mediump sampler2D;

in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
out vec4 fragColor;
uniform sampler2D uVelocity;

void main () {
    float L = texture(uVelocity, vL).x;
    float R = texture(uVelocity, vR).x;
    float T = texture(uVelocity, vT).y;
    float B = texture(uVelocity, vB).y;

    vec2 C = texture(uVelocity, vUv).xy;
    if (vL.x < 0.0) { L = -C.x; }
    if (vR.x > 1.0) { R = -C.x; }
    if (vT.y > 1.0) { T = -C.y; }
    if (vB.y < 0.0) { B = -C.y; }

    float div = 0.5 * (R - L + T - B);
    fragColor = vec4(div, 0.0, 0.0, 1.0);
}
`;

const curlShaderSource = `#version 300 es
precision mediump float;
precision mediump sampler2D;

in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
out vec4 fragColor;
uniform sampler2D uVelocity;

void main () {
    float L = texture(uVelocity, vL).y;
    float R = texture(uVelocity, vR).y;
    float T = texture(uVelocity, vT).x;
    float B = texture(uVelocity, vB).x;
    float vorticity = R - L - T + B;
    fragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
}
`;

const vorticityShaderSource = `#version 300 es
precision highp float;
precision highp sampler2D;

in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
out vec4 fragColor;
uniform sampler2D uVelocity;
uniform sampler2D uCurl;
uniform float curl;
uniform float dt;

void main () {
    float L = texture(uCurl, vL).x;
    float R = texture(uCurl, vR).x;
    float T = texture(uCurl, vT).x;
    float B = texture(uCurl, vB).x;
    float C = texture(uCurl, vUv).x;

    vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
    force /= length(force) + 0.0001;
    force *= curl * C;
    force.y *= -1.0;

    vec2 velocity = texture(uVelocity, vUv).xy;
    velocity += force * dt;
    velocity = min(max(velocity, -1000.0), 1000.0);
    fragColor = vec4(velocity, 0.0, 1.0);
}
`;

const pressureShaderSource = `#version 300 es
precision mediump float;
precision mediump sampler2D;

in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
out vec4 fragColor;
uniform sampler2D uPressure;
uniform sampler2D uDivergence;

void main () {
    float L = texture(uPressure, vL).x;
    float R = texture(uPressure, vR).x;
    float T = texture(uPressure, vT).x;
    float B = texture(uPressure, vB).x;
    float divergence = texture(uDivergence, vUv).x;
    float pressure = (L + R + B + T - divergence) * 0.25;
    fragColor = vec4(pressure, 0.0, 0.0, 1.0);
}
`;

const gradientSubtractShaderSource = `#version 300 es
precision mediump float;
precision mediump sampler2D;

in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
out vec4 fragColor;
uniform sampler2D uPressure;
uniform sampler2D uVelocity;

void main () {
    float L = texture(uPressure, vL).x;
    float R = texture(uPressure, vR).x;
    float T = texture(uPressure, vT).x;
    float B = texture(uPressure, vB).x;
    vec2 velocity = texture(uVelocity, vUv).xy;
    velocity.xy -= vec2(R - L, T - B);
    fragColor = vec4(velocity, 0.0, 1.0);
}
`;

const clearShaderSource = `#version 300 es
precision mediump float;
precision mediump sampler2D;

in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uTexture;
uniform float value;

void main () {
    fragColor = value * texture(uTexture, vUv);
}
`;

const displayShaderSource = `#version 300 es
precision highp float;
precision highp sampler2D;

in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uTexture;
uniform sampler2D uBloom;
uniform float bloomIntensity;

vec3 linearToGamma (vec3 color) {
    color = max(color, vec3(0));
    return max(1.055 * pow(color, vec3(0.416666667)) - 0.055, vec3(0));
}

void main () {
    vec3 c = texture(uTexture, vUv).rgb;

    if (bloomIntensity > 0.0) {
        vec3 bloom = texture(uBloom, vUv).rgb;
        bloom = linearToGamma(bloom);
        c += bloom * bloomIntensity;
    }

    float a = max(c.r, max(c.g, c.b));
    fragColor = vec4(c, a);
}
`;

const bloomBlurShaderSource = `#version 300 es
precision mediump float;
precision mediump sampler2D;

in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
out vec4 fragColor;
uniform sampler2D uTexture;

void main () {
    vec4 sum = vec4(0.0);
    sum += texture(uTexture, vL);
    sum += texture(uTexture, vR);
    sum += texture(uTexture, vT);
    sum += texture(uTexture, vB);
    sum *= 0.25;
    fragColor = sum;
}
`;

const bloomPrefilterShaderSource = `#version 300 es
precision mediump float;
precision mediump sampler2D;

in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uTexture;
uniform vec3 curve;
uniform float threshold;

void main () {
    vec3 c = texture(uTexture, vUv).rgb;
    float br = max(c.r, max(c.g, c.b));
    float rq = clamp(br - curve.x, 0.0, curve.y);
    rq = curve.z * rq * rq;
    c *= max(rq, br - threshold) / max(br, 0.0001);
    fragColor = vec4(c, 0.0);
}
`;

const bloomFinalShaderSource = `#version 300 es
precision mediump float;
precision mediump sampler2D;

in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
out vec4 fragColor;
uniform sampler2D uTexture;
uniform float intensity;

void main () {
    vec4 sum = vec4(0.0);
    sum += texture(uTexture, vL);
    sum += texture(uTexture, vR);
    sum += texture(uTexture, vT);
    sum += texture(uTexture, vB);
    sum *= 0.25;
    fragColor = sum * intensity;
}
`;

// ---------------------------------------------------------------------------
// FluidSim class
// ---------------------------------------------------------------------------

class FluidSim {
    constructor () {
        this.gl = null;
        this.canvas = null;

        // Simulation parameters — defaults
        this.params = {
            viscosity: 0.3,
            diffusion: 0.5,
            curl: 0.3,
            pressure: 0.6,
            splatRadius: 0.004,
            dissipation: 0.97,
            bloomIntensity: 0.3,
            idleForce: 0,
        };

        // Internal state
        this._programs = {};
        this._fbos = {};
        this._bloomFBOs = [];
        this._quadVAO = null;
        this._quadVBO = null;
        this._quadEBO = null;
        this._simResolution = 256;
        this._bloomIterations = 8;
        this._bloomThreshold = 0.6;
        this._bloomSoftKnee = 0.7;
        this._pressureIterations = 20;
        this._initialized = false;
    }

    // -----------------------------------------------------------------------
    // Public API
    // -----------------------------------------------------------------------

    init (canvas) {
        this.canvas = canvas;

        const params = {
            alpha: true,
            depth: false,
            stencil: false,
            antialias: false,
            preserveDrawingBuffer: false,
        };

        const gl = canvas.getContext('webgl2', params);
        if (!gl) {
            console.error('FluidSim: WebGL 2.0 not supported');
            return false;
        }
        this.gl = gl;

        // Enable float color buffer support
        gl.getExtension('EXT_color_buffer_float');
        gl.getExtension('OES_texture_float_linear');

        gl.clearColor(0.0, 0.0, 0.0, 1.0);

        // Detect supported texture formats (with fallbacks)
        this._texType = gl.HALF_FLOAT;
        this._formatRGBA = this._getSupportedFormat(gl.RGBA16F, gl.RGBA);
        this._formatRG = this._getSupportedFormat(gl.RG16F, gl.RG);
        this._formatR = this._getSupportedFormat(gl.R16F, gl.RED);

        // Build fullscreen quad geometry
        this._initQuad();

        // Compile all shader programs
        this._compilePrograms();

        // Create framebuffers
        this._initFramebuffers();

        this._initialized = true;
        return true;
    }

    setMoodParams (params) {
        if (params.viscosity !== undefined) this.params.viscosity = params.viscosity;
        if (params.diffusion !== undefined) this.params.diffusion = params.diffusion;
        if (params.curl !== undefined) this.params.curl = params.curl;
        if (params.pressure !== undefined) this.params.pressure = params.pressure;
        if (params.splatRadius !== undefined) this.params.splatRadius = params.splatRadius;
        if (params.dissipation !== undefined) this.params.dissipation = params.dissipation;
        if (params.bloomIntensity !== undefined) this.params.bloomIntensity = params.bloomIntensity;
        if (params.idleForce !== undefined) this.params.idleForce = params.idleForce;
    }

    addSplat (x, y, dx, dy, color, radius) {
        if (!this._initialized) return;
        const gl = this.gl;
        const r = radius !== undefined ? radius : this.params.splatRadius;

        gl.disable(gl.BLEND);

        // Splat velocity
        const splatProg = this._programs.splat;
        gl.useProgram(splatProg.program);
        gl.uniform1i(splatProg.uniforms.uTarget, this._fbos.velocity.read.attach(gl, 0));
        gl.uniform1f(splatProg.uniforms.aspectRatio, this.canvas.width / this.canvas.height);
        gl.uniform2f(splatProg.uniforms.point, x, y);
        gl.uniform3f(splatProg.uniforms.color, dx, dy, 0.0);
        gl.uniform1f(splatProg.uniforms.radius, this._correctRadius(r));
        this._blit(this._fbos.velocity.write);
        this._fbos.velocity.swap();

        // Splat dye
        gl.uniform1i(splatProg.uniforms.uTarget, this._fbos.dye.read.attach(gl, 0));
        gl.uniform3f(splatProg.uniforms.color, color[0], color[1], color[2]);
        this._blit(this._fbos.dye.write);
        this._fbos.dye.swap();
    }

    step (dt) {
        if (!this._initialized) return;
        const gl = this.gl;
        const p = this.params;

        gl.disable(gl.BLEND);

        const velocity = this._fbos.velocity;
        const dye = this._fbos.dye;
        const divergenceFBO = this._fbos.divergence;
        const curlFBO = this._fbos.curl;
        const pressure = this._fbos.pressure;

        // 1. Curl
        const curlProg = this._programs.curl;
        gl.useProgram(curlProg.program);
        gl.uniform2f(curlProg.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
        gl.uniform1i(curlProg.uniforms.uVelocity, velocity.read.attach(gl, 0));
        this._blit(curlFBO);

        // 2. Vorticity
        const vortProg = this._programs.vorticity;
        gl.useProgram(vortProg.program);
        gl.uniform2f(vortProg.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
        gl.uniform1i(vortProg.uniforms.uVelocity, velocity.read.attach(gl, 0));
        gl.uniform1i(vortProg.uniforms.uCurl, curlFBO.attach(gl, 1));
        gl.uniform1f(vortProg.uniforms.curl, p.curl);
        gl.uniform1f(vortProg.uniforms.dt, dt);
        this._blit(velocity.write);
        velocity.swap();

        // 3. Divergence
        const divProg = this._programs.divergence;
        gl.useProgram(divProg.program);
        gl.uniform2f(divProg.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
        gl.uniform1i(divProg.uniforms.uVelocity, velocity.read.attach(gl, 0));
        this._blit(divergenceFBO);

        // 4. Clear pressure (multiply by pressure param for dissipation)
        const clearProg = this._programs.clear;
        gl.useProgram(clearProg.program);
        gl.uniform1i(clearProg.uniforms.uTexture, pressure.read.attach(gl, 0));
        gl.uniform1f(clearProg.uniforms.value, p.pressure);
        this._blit(pressure.write);
        pressure.swap();

        // 5. Pressure solve (~20 Jacobi iterations)
        const presProg = this._programs.pressure;
        gl.useProgram(presProg.program);
        gl.uniform2f(presProg.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
        gl.uniform1i(presProg.uniforms.uDivergence, divergenceFBO.attach(gl, 0));
        for (let i = 0; i < this._pressureIterations; i++) {
            gl.uniform1i(presProg.uniforms.uPressure, pressure.read.attach(gl, 1));
            this._blit(pressure.write);
            pressure.swap();
        }

        // 6. Gradient subtract
        const gradProg = this._programs.gradientSubtract;
        gl.useProgram(gradProg.program);
        gl.uniform2f(gradProg.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
        gl.uniform1i(gradProg.uniforms.uPressure, pressure.read.attach(gl, 0));
        gl.uniform1i(gradProg.uniforms.uVelocity, velocity.read.attach(gl, 1));
        this._blit(velocity.write);
        velocity.swap();

        // 7. Advect velocity through itself
        const advProg = this._programs.advection;
        gl.useProgram(advProg.program);
        gl.uniform2f(advProg.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
        const velId = velocity.read.attach(gl, 0);
        gl.uniform1i(advProg.uniforms.uVelocity, velId);
        gl.uniform1i(advProg.uniforms.uSource, velId);
        gl.uniform1f(advProg.uniforms.dt, dt);
        gl.uniform1f(advProg.uniforms.dissipation, p.viscosity);
        this._blit(velocity.write);
        velocity.swap();

        // 8. Advect dye through velocity
        gl.uniform1i(advProg.uniforms.uVelocity, velocity.read.attach(gl, 0));
        gl.uniform1i(advProg.uniforms.uSource, dye.read.attach(gl, 1));
        gl.uniform1f(advProg.uniforms.dissipation, p.diffusion);
        this._blit(dye.write);
        dye.swap();

        // 9. Bloom pass
        if (p.bloomIntensity > 0 && this._bloomFBOs.length >= 2) {
            this._applyBloom(dye.read, this._fbos.bloomSource);
        }

        // 10. Display to screen
        this._renderDisplay();
    }

    resize (width, height) {
        if (!this._initialized) return;

        this.canvas.width = width;
        this.canvas.height = height;

        // Recreate framebuffers at new resolution
        this._initFramebuffers();
    }

    destroy () {
        if (!this._initialized) return;
        const gl = this.gl;

        // Delete programs
        for (const key in this._programs) {
            if (this._programs[key] && this._programs[key].program) {
                gl.deleteProgram(this._programs[key].program);
            }
        }
        this._programs = {};

        // Delete FBOs
        this._deleteAllFBOs();

        // Delete quad geometry
        if (this._quadVAO) gl.deleteVertexArray(this._quadVAO);
        if (this._quadVBO) gl.deleteBuffer(this._quadVBO);
        if (this._quadEBO) gl.deleteBuffer(this._quadEBO);
        this._quadVAO = null;
        this._quadVBO = null;
        this._quadEBO = null;

        this._initialized = false;
    }

    // -----------------------------------------------------------------------
    // Private — quad geometry
    // -----------------------------------------------------------------------

    _initQuad () {
        const gl = this.gl;

        this._quadVAO = gl.createVertexArray();
        gl.bindVertexArray(this._quadVAO);

        this._quadVBO = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this._quadVBO);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);

        this._quadEBO = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._quadEBO);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);

        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(0);

        gl.bindVertexArray(null);
    }

    // -----------------------------------------------------------------------
    // Private — blit (draw fullscreen quad into target)
    // -----------------------------------------------------------------------

    _blit (target) {
        const gl = this.gl;
        gl.bindVertexArray(this._quadVAO);

        if (target == null) {
            gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        } else {
            gl.viewport(0, 0, target.width, target.height);
            gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
        }

        gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    }

    // -----------------------------------------------------------------------
    // Private — shader compilation
    // -----------------------------------------------------------------------

    _compileShader (type, source) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const info = gl.getShaderInfoLog(shader);
            gl.deleteShader(shader);
            throw new Error('FluidSim shader compile error: ' + info);
        }

        return shader;
    }

    _createProgram (vertexSource, fragmentSource) {
        const gl = this.gl;

        const vs = this._compileShader(gl.VERTEX_SHADER, vertexSource);
        const fs = this._compileShader(gl.FRAGMENT_SHADER, fragmentSource);

        const program = gl.createProgram();
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);

        // Bind aPosition to location 0
        gl.bindAttribLocation(program, 0, 'aPosition');

        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            const info = gl.getProgramInfoLog(program);
            gl.deleteProgram(program);
            throw new Error('FluidSim program link error: ' + info);
        }

        // Clean up individual shaders — they're linked into the program now
        gl.deleteShader(vs);
        gl.deleteShader(fs);

        // Gather uniforms
        const uniforms = {};
        const uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
        for (let i = 0; i < uniformCount; i++) {
            const info = gl.getActiveUniform(program, i);
            uniforms[info.name] = gl.getUniformLocation(program, info.name);
        }

        return { program, uniforms };
    }

    _compilePrograms () {
        this._programs.splat = this._createProgram(baseVertexShaderSource, splatShaderSource);
        this._programs.advection = this._createProgram(baseVertexShaderSource, advectionShaderSource);
        this._programs.divergence = this._createProgram(baseVertexShaderSource, divergenceShaderSource);
        this._programs.curl = this._createProgram(baseVertexShaderSource, curlShaderSource);
        this._programs.vorticity = this._createProgram(baseVertexShaderSource, vorticityShaderSource);
        this._programs.pressure = this._createProgram(baseVertexShaderSource, pressureShaderSource);
        this._programs.gradientSubtract = this._createProgram(baseVertexShaderSource, gradientSubtractShaderSource);
        this._programs.clear = this._createProgram(baseVertexShaderSource, clearShaderSource);
        this._programs.display = this._createProgram(baseVertexShaderSource, displayShaderSource);
        this._programs.bloomBlur = this._createProgram(baseVertexShaderSource, bloomBlurShaderSource);
        this._programs.bloomPrefilter = this._createProgram(baseVertexShaderSource, bloomPrefilterShaderSource);
        this._programs.bloomFinal = this._createProgram(baseVertexShaderSource, bloomFinalShaderSource);
    }

    // -----------------------------------------------------------------------
    // Private — framebuffer management
    // -----------------------------------------------------------------------

    _getSupportedFormat (internalFormat, format) {
        const gl = this.gl;
        if (!this._supportsRenderTextureFormat(internalFormat, format)) {
            // Fallback chain: R16F -> RG16F -> RGBA16F
            switch (internalFormat) {
                case gl.R16F:
                    return this._getSupportedFormat(gl.RG16F, gl.RG);
                case gl.RG16F:
                    return this._getSupportedFormat(gl.RGBA16F, gl.RGBA);
                default:
                    return null;
            }
        }
        return { internalFormat, format };
    }

    _supportsRenderTextureFormat (internalFormat, format) {
        const gl = this.gl;
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, this._texType, null);

        const fbo = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

        const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.deleteFramebuffer(fbo);
        gl.deleteTexture(texture);

        return status === gl.FRAMEBUFFER_COMPLETE;
    }

    _createFBO (w, h, internalFormat, format, type, filtering) {
        const gl = this.gl;

        gl.activeTexture(gl.TEXTURE0);
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filtering);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filtering);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);

        const fbo = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        gl.viewport(0, 0, w, h);
        gl.clear(gl.COLOR_BUFFER_BIT);

        const texelSizeX = 1.0 / w;
        const texelSizeY = 1.0 / h;

        return {
            texture,
            fbo,
            width: w,
            height: h,
            texelSizeX,
            texelSizeY,
            attach (glCtx, id) {
                glCtx.activeTexture(glCtx.TEXTURE0 + id);
                glCtx.bindTexture(glCtx.TEXTURE_2D, texture);
                return id;
            }
        };
    }

    _createDoubleFBO (w, h, internalFormat, format, type, filtering) {
        let fbo1 = this._createFBO(w, h, internalFormat, format, type, filtering);
        let fbo2 = this._createFBO(w, h, internalFormat, format, type, filtering);

        return {
            width: w,
            height: h,
            texelSizeX: fbo1.texelSizeX,
            texelSizeY: fbo1.texelSizeY,
            get read () { return fbo1; },
            set read (value) { fbo1 = value; },
            get write () { return fbo2; },
            set write (value) { fbo2 = value; },
            swap () {
                const temp = fbo1;
                fbo1 = fbo2;
                fbo2 = temp;
            }
        };
    }

    _deleteFBO (fbo) {
        if (!fbo) return;
        const gl = this.gl;
        if (fbo.texture) gl.deleteTexture(fbo.texture);
        if (fbo.fbo) gl.deleteFramebuffer(fbo.fbo);
    }

    _deleteDoubleFBO (doubleFBO) {
        if (!doubleFBO) return;
        this._deleteFBO(doubleFBO.read);
        this._deleteFBO(doubleFBO.write);
    }

    _deleteAllFBOs () {
        this._deleteDoubleFBO(this._fbos.velocity);
        this._deleteDoubleFBO(this._fbos.dye);
        this._deleteDoubleFBO(this._fbos.pressure);
        this._deleteFBO(this._fbos.divergence);
        this._deleteFBO(this._fbos.curl);
        this._deleteFBO(this._fbos.bloomSource);
        for (let i = 0; i < this._bloomFBOs.length; i++) {
            this._deleteFBO(this._bloomFBOs[i]);
        }
        this._bloomFBOs = [];
        this._fbos = {};
    }

    _getResolution (resolution) {
        const gl = this.gl;
        let aspectRatio = gl.drawingBufferWidth / gl.drawingBufferHeight;
        if (aspectRatio < 1) aspectRatio = 1.0 / aspectRatio;

        const min = Math.round(resolution);
        const max = Math.round(resolution * aspectRatio);

        if (gl.drawingBufferWidth > gl.drawingBufferHeight) {
            return { width: max, height: min };
        } else {
            return { width: min, height: max };
        }
    }

    _initFramebuffers () {
        const gl = this.gl;
        const simRes = this._getResolution(this._simResolution);
        const dyeRes = this._getResolution(Math.max(this.canvas.width, this.canvas.height));

        const texType = this._texType;
        const rgba = this._formatRGBA;
        const rg = this._formatRG;
        const r = this._formatR;
        const filtering = gl.LINEAR;

        // Clean up old FBOs
        this._deleteAllFBOs();

        gl.disable(gl.BLEND);

        // Simulation double-buffered FBOs
        this._fbos.velocity = this._createDoubleFBO(
            simRes.width, simRes.height,
            rg.internalFormat, rg.format, texType, filtering
        );
        this._fbos.pressure = this._createDoubleFBO(
            simRes.width, simRes.height,
            r.internalFormat, r.format, texType, gl.NEAREST
        );
        this._fbos.dye = this._createDoubleFBO(
            dyeRes.width, dyeRes.height,
            rgba.internalFormat, rgba.format, texType, filtering
        );

        // Single-buffered FBOs
        this._fbos.divergence = this._createFBO(
            simRes.width, simRes.height,
            r.internalFormat, r.format, texType, gl.NEAREST
        );
        this._fbos.curl = this._createFBO(
            simRes.width, simRes.height,
            r.internalFormat, r.format, texType, gl.NEAREST
        );

        // Bloom FBOs
        this._initBloomFramebuffers();
    }

    _initBloomFramebuffers () {
        const gl = this.gl;
        const res = this._getResolution(
            Math.max(this.canvas.width, this.canvas.height) / 2
        );

        const texType = this._texType;
        const rgba = this._formatRGBA;
        const filtering = gl.LINEAR;

        this._fbos.bloomSource = this._createFBO(
            res.width, res.height,
            rgba.internalFormat, rgba.format, texType, filtering
        );

        this._bloomFBOs = [];
        for (let i = 0; i < this._bloomIterations; i++) {
            const width = res.width >> (i + 1);
            const height = res.height >> (i + 1);

            if (width < 2 || height < 2) break;

            const fbo = this._createFBO(
                width, height,
                rgba.internalFormat, rgba.format, texType, filtering
            );
            this._bloomFBOs.push(fbo);
        }
    }

    // -----------------------------------------------------------------------
    // Private — rendering passes
    // -----------------------------------------------------------------------

    _correctRadius (radius) {
        const aspectRatio = this.canvas.width / this.canvas.height;
        if (aspectRatio > 1) {
            return radius * aspectRatio;
        }
        return radius;
    }

    _applyBloom (source, destination) {
        if (this._bloomFBOs.length < 2) return;

        const gl = this.gl;
        let last = destination;

        gl.disable(gl.BLEND);

        // Prefilter — extract bright areas
        const prefilterProg = this._programs.bloomPrefilter;
        gl.useProgram(prefilterProg.program);
        const knee = this._bloomThreshold * this._bloomSoftKnee + 0.0001;
        const curve0 = this._bloomThreshold - knee;
        const curve1 = knee * 2;
        const curve2 = 0.25 / knee;
        gl.uniform3f(prefilterProg.uniforms.curve, curve0, curve1, curve2);
        gl.uniform1f(prefilterProg.uniforms.threshold, this._bloomThreshold);
        gl.uniform1i(prefilterProg.uniforms.uTexture, source.attach(gl, 0));
        this._blit(last);

        // Downsample blur chain
        const blurProg = this._programs.bloomBlur;
        gl.useProgram(blurProg.program);
        for (let i = 0; i < this._bloomFBOs.length; i++) {
            const dest = this._bloomFBOs[i];
            gl.uniform2f(blurProg.uniforms.texelSize, last.texelSizeX, last.texelSizeY);
            gl.uniform1i(blurProg.uniforms.uTexture, last.attach(gl, 0));
            this._blit(dest);
            last = dest;
        }

        // Upsample and accumulate
        gl.blendFunc(gl.ONE, gl.ONE);
        gl.enable(gl.BLEND);

        for (let i = this._bloomFBOs.length - 2; i >= 0; i--) {
            const baseTex = this._bloomFBOs[i];
            gl.uniform2f(blurProg.uniforms.texelSize, last.texelSizeX, last.texelSizeY);
            gl.uniform1i(blurProg.uniforms.uTexture, last.attach(gl, 0));
            gl.viewport(0, 0, baseTex.width, baseTex.height);
            this._blit(baseTex);
            last = baseTex;
        }

        gl.disable(gl.BLEND);

        // Final bloom composite into destination
        const finalProg = this._programs.bloomFinal;
        gl.useProgram(finalProg.program);
        gl.uniform2f(finalProg.uniforms.texelSize, last.texelSizeX, last.texelSizeY);
        gl.uniform1i(finalProg.uniforms.uTexture, last.attach(gl, 0));
        gl.uniform1f(finalProg.uniforms.intensity, this.params.bloomIntensity);
        this._blit(destination);
    }

    _renderDisplay () {
        const gl = this.gl;
        const p = this.params;

        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.enable(gl.BLEND);

        const displayProg = this._programs.display;
        gl.useProgram(displayProg.program);
        gl.uniform1i(displayProg.uniforms.uTexture, this._fbos.dye.read.attach(gl, 0));

        if (p.bloomIntensity > 0 && this._fbos.bloomSource) {
            gl.uniform1i(displayProg.uniforms.uBloom, this._fbos.bloomSource.attach(gl, 1));
            gl.uniform1f(displayProg.uniforms.bloomIntensity, p.bloomIntensity);
        } else {
            gl.uniform1f(displayProg.uniforms.bloomIntensity, 0.0);
        }

        this._blit(null); // Render to screen
    }
}

// ---------------------------------------------------------------------------
// Expose on window
// ---------------------------------------------------------------------------
window.FluidSim = FluidSim;
