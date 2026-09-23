import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// Final pass: film grain, a whisper of chromatic aberration, a navy-black vignette,
// and the 6-frame dip to navy used between beats. Runs in display (sRGB) space.
const FinishShader = {
  uniforms: {
    tDiffuse: { value: null },
    uFrame: { value: 0 },
    uRes: { value: new THREE.Vector2(1920, 1080) },
    uGrain: { value: 0.045 },
    uCA: { value: 0.0018 },
    uVignette: { value: 0.55 },
    uVigColor: { value: new THREE.Color('#00000f') },
    uDip: { value: 0 },
    uDipColor: { value: new THREE.Color('#000042') },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float uFrame, uGrain, uCA, uVignette, uDip;
    uniform vec2 uRes;
    uniform vec3 uVigColor, uDipColor;
    varying vec2 vUv;

    float hash(vec3 p) {
      p = fract(p * vec3(443.897, 441.423, 437.195));
      p += dot(p, p.yzx + 19.19);
      return fract((p.x + p.y) * p.z);
    }

    void main() {
      vec2 c = vUv - 0.5;
      float r2 = dot(c, c);
      // Radial chromatic aberration, zero at centre, strongest in the corners.
      vec2 off = c * r2 * uCA * 8.0;
      vec3 col;
      col.r = texture2D(tDiffuse, vUv - off).r;
      col.g = texture2D(tDiffuse, vUv).g;
      col.b = texture2D(tDiffuse, vUv + off).b;

      // Vignette pulls toward navy-black, never grey.
      float v = smoothstep(0.18, 0.95, r2 * 1.9) * uVignette;
      col = mix(col, uVigColor, v);

      // Luma-weighted grain, re-seeded every frame (frame index, not wall clock: exports repeat).
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      float n = hash(vec3(gl_FragCoord.xy, mod(uFrame, 997.0))) - 0.5;
      float amt = uGrain * (0.35 + 0.65 * (1.0 - abs(l * 2.0 - 1.0)));
      col += n * amt;

      col = mix(col, uDipColor, uDip);
      gl_FragColor = vec4(col, 1.0);
    }`,
};

export function buildPost(renderer, scene, camera, W, H) {
  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(1);
  composer.setSize(W, H);

  composer.addPass(new RenderPass(scene, camera));

  const bokeh = new BokehPass(scene, camera, { focus: 30, aperture: 0.0006, maxblur: 0.008 });
  // Additive fog planes must not write into the depth used for focus.
  const hidden = [];
  const baseRender = bokeh.render.bind(bokeh);
  bokeh.render = (...args) => {
    scene.traverseVisible((o) => { if (o.userData.noDepth) hidden.push(o); });
    for (const o of hidden) o.visible = false;
    baseRender(...args);
    for (const o of hidden) o.visible = true;
    hidden.length = 0;
  };
  composer.addPass(bokeh);

  const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.9, 0.55, 0.62);
  composer.addPass(bloom);

  composer.addPass(new OutputPass()); // tone mapping + sRGB
  const smaa = new SMAAPass(W, H);
  composer.addPass(smaa);

  const finish = new ShaderPass(FinishShader);
  finish.uniforms.uRes.value.set(W, H);
  composer.addPass(finish);

  // One object the timeline tweens. focus is a distance along the view axis (world units).
  const state = {
    focus: 30, aperture: 0.0006, maxblur: 0.008,
    bloom: 0.9, bloomRadius: 0.55, bloomThreshold: 0.62,
    grain: 0.045, ca: 0.0018, vignette: 0.55, dip: 0,
  };

  function apply(frame) {
    bokeh.uniforms.focus.value = state.focus;
    bokeh.uniforms.aperture.value = state.aperture;
    bokeh.uniforms.maxblur.value = state.maxblur;
    bokeh.enabled = state.aperture > 0;
    bloom.strength = state.bloom;
    bloom.enabled = state.bloom > 0.001; // skip the pass entirely when glow is off
    bloom.radius = state.bloomRadius;
    bloom.threshold = state.bloomThreshold;
    const u = finish.uniforms;
    u.uFrame.value = frame; u.uGrain.value = state.grain; u.uCA.value = state.ca;
    u.uVignette.value = state.vignette; u.uDip.value = state.dip;
  }

  return { composer, state, apply, passes: { bokeh, bloom, smaa, finish } };
}
