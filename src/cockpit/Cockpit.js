import * as THREE from "three";

/**
 * First-person sci-fi cockpit, parented to the camera so the visitor
 * stays inside the ship while the universe rushes past.
 *
 * Built as original geometry (inspired by VattalusAssets "Sci fi Cockpit 2
 * Light Fighter") because a Sketchfab iframe cannot be driven as our
 * cinematic camera.
 */
export class Cockpit {
  constructor(camera) {
    this.group = new THREE.Group();
    camera.add(this.group);
    this.group.position.set(0, 0, 0);

    this.emissives = [];
    this.glass = [];

    const metal = new THREE.MeshStandardMaterial({
      color: 0x12161e,
      metalness: 0.82,
      roughness: 0.28,
    });
    const dark = new THREE.MeshStandardMaterial({
      color: 0x07090d,
      metalness: 0.6,
      roughness: 0.45,
    });
    const trim = new THREE.MeshStandardMaterial({
      color: 0x8adfff,
      emissive: 0x3ec8ff,
      emissiveIntensity: 0.7,
      metalness: 0.2,
      roughness: 0.3,
    });

    // Canopy frame — hexagonal windshield opening.
    const frameShape = new THREE.Shape();
    const hw = 1.55;
    const hh = 0.72;
    frameShape.moveTo(-hw, -hh * 0.55);
    frameShape.lineTo(-hw * 0.72, hh);
    frameShape.lineTo(hw * 0.72, hh);
    frameShape.lineTo(hw, -hh * 0.55);
    frameShape.lineTo(hw * 0.5, -hh);
    frameShape.lineTo(-hw * 0.5, -hh);
    frameShape.closePath();
    const hole = new THREE.Path();
    const ihw = 1.28;
    const ihh = 0.52;
    hole.moveTo(-ihw, -ihh * 0.5);
    hole.lineTo(-ihw * 0.7, ihh);
    hole.lineTo(ihw * 0.7, ihh);
    hole.lineTo(ihw, -ihh * 0.5);
    hole.lineTo(ihw * 0.45, -ihh * 0.92);
    hole.lineTo(-ihw * 0.45, -ihh * 0.92);
    hole.closePath();
    frameShape.holes.push(hole);

    const frameGeo = new THREE.ExtrudeGeometry(frameShape, {
      depth: 0.08,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 2,
    });
    const frame = new THREE.Mesh(frameGeo, metal);
    frame.position.set(0, 0.18, -1.55);
    this.group.add(frame);

    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x0a1824,
      roughness: 0.08,
      metalness: 0.35,
      transparent: true,
      opacity: 0.16,
      envMapIntensity: 1.2,
    });
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 1.05), glassMat);
    glass.position.set(0, 0.2, -1.5);
    this.group.add(glass);
    this.glass.push(glass);

    // Dashboard
    const dash = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.18, 0.9), metal);
    dash.position.set(0, -0.55, -0.95);
    dash.rotation.x = 0.18;
    this.group.add(dash);

    const dashFace = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.06, 0.7), dark);
    dashFace.position.set(0, -0.44, -0.92);
    dashFace.rotation.x = 0.18;
    this.group.add(dashFace);

    // Side consoles
    const left = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.1, 2.4), metal);
    left.position.set(-1.55, -0.15, -0.4);
    left.rotation.z = 0.08;
    this.group.add(left);
    const right = left.clone();
    right.position.x = 1.55;
    right.rotation.z = -0.08;
    this.group.add(right);

    // Floor
    const floor = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.08, 2.6), dark);
    floor.position.set(0, -0.92, 0.1);
    this.group.add(floor);

    // Ceiling spine
    const roof = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 2.2), metal);
    roof.position.set(0, 0.78, -0.3);
    this.group.add(roof);

    // Emissive light strips
    const stripGeo = new THREE.BoxGeometry(2.2, 0.012, 0.03);
    const makeStrip = (x, y, z, rotX = 0, w = 2.2) => {
      const m = trim.clone();
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, 0.012, 0.03), m);
      mesh.position.set(x, y, z);
      mesh.rotation.x = rotX;
      this.group.add(mesh);
      this.emissives.push(m);
      return mesh;
    };
    makeStrip(0, -0.36, -1.28, 0.18);
    makeStrip(0, 0.62, -1.35, 0);
    makeStrip(-1.38, 0.05, -0.5, 0, 0.04).scale.set(1, 1, 40);
    makeStrip(1.38, 0.05, -0.5, 0, 0.04).scale.set(1, 1, 40);

    // Structural ribs beside the windshield
    for (const side of [-1, 1]) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.35, 0.08), metal);
      rib.position.set(side * 1.42, 0.05, -1.42);
      rib.rotation.z = side * -0.18;
      this.group.add(rib);
    }

    // Seat-back hint behind the camera (felt more than seen)
    const headrest = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.35, 0.12), metal);
    headrest.position.set(0, 0.15, 0.42);
    this.group.add(headrest);

    this.baseEmissive = 0.7;
    this.visibility = 1;
  }

  setIntensity(value) {
    const e = this.baseEmissive * (0.75 + value * 1.4);
    this.emissives.forEach((m) => {
      m.emissiveIntensity = e;
    });
  }

  /**
   * Fade the cockpit as we enter the wormhole so the tunnel can dominate.
   */
  setVisibility(t) {
    this.visibility = t;
    this.group.visible = t > 0.02;
    this.group.traverse((obj) => {
      if (obj.material && obj.material.opacity != null && obj.material.transparent) {
        obj.material.opacity = 0.28 * t;
      }
    });
  }

  update(time) {
    const flicker = 1 + Math.sin(time * 3.1) * 0.04 + Math.sin(time * 7.7) * 0.02;
    this.emissives.forEach((m, i) => {
      m.emissiveIntensity = this.baseEmissive * flicker * (1 + (i % 3) * 0.05);
    });
  }
}
