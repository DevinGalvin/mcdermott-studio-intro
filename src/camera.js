import * as THREE from 'three';

// A camera move is a set of keys in seconds. Each channel is a cubic Hermite spline
// with zero velocity at the ends and smooth tangents through interior keys, so a move
// can change direction without ever stopping or jerking. GSAP drives the playhead `u`.
//
// Keys describe an orbit rig: a target point, and the camera's radius / elevation /
// azimuth around it (degrees). Push-ins are radius, orbits are azimuth, descents are
// elevation. fov in degrees.
const CH = ['tx', 'ty', 'tz', 'r', 'el', 'az', 'fov'];

function hermiteChannel(times, vals) {
  const n = times.length;
  const m = vals.map((_, i) => (i === 0 || i === n - 1) ? 0
    : (vals[i + 1] - vals[i - 1]) / (times[i + 1] - times[i - 1]));
  return (t) => {
    if (t <= times[0]) return vals[0];
    if (t >= times[n - 1]) return vals[n - 1];
    let i = 0; while (t > times[i + 1]) i++;
    const h = times[i + 1] - times[i], s = (t - times[i]) / h;
    const s2 = s * s, s3 = s2 * s;
    return (2 * s3 - 3 * s2 + 1) * vals[i] + (s3 - 2 * s2 + s) * h * m[i]
      + (-2 * s3 + 3 * s2) * vals[i + 1] + (s3 - s2) * h * m[i + 1];
  };
}

export function cameraMove(keys) {
  const t0 = keys[0].t, t1 = keys[keys.length - 1].t;
  const times = keys.map((k) => k.t);
  const ch = {};
  for (const c of CH) ch[c] = hermiteChannel(times, keys.map((k) => k[c]));
  return {
    start: t0, end: t1, u: 0,
    sample(out) {
      const t = t0 + (t1 - t0) * this.u;
      for (const c of CH) out[c] = ch[c](t);
      return out;
    },
  };
}

const _v = new THREE.Vector3(), _d = new THREE.Vector3();
const DEG = Math.PI / 180;

export function applyRig(camera, s) {
  const el = s.el * DEG, az = s.az * DEG;
  camera.position.set(
    s.tx + s.r * Math.cos(el) * Math.sin(az),
    s.ty + s.r * Math.sin(el),
    s.tz + s.r * Math.cos(el) * Math.cos(az));
  camera.lookAt(s.tx, s.ty, s.tz);
  if (camera.fov !== s.fov) { camera.fov = s.fov; camera.updateProjectionMatrix(); }
}

// Distance from the camera to point p measured along the view axis: what BokehPass wants.
export function focusDistance(camera, p) {
  camera.getWorldDirection(_d);
  return Math.max(0.1, _v.copy(p).sub(camera.position).dot(_d));
}
