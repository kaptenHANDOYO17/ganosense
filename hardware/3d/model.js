// Model 3D GanoProbe (satuan: cm). Dipakai untuk render (browser) & ekspor STL (Node).
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'

export const C = {
  body: 0x24503a, bodyDark: 0x1a3a2a, tube: 0x9aa3a0, grip: 0x2b2b2b, bell: 0x3f7d57, gasket: 0x151515,
  yellow: 0xf2b705, pcb: 0x1f6f3a, pcbBlue: 0x1f4fa8, metal: 0xc9cdd2, black: 0x111111, beige: 0xd9cfb8, battery: 0x2e7dd1,
}
const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: o.r ?? 0.55, metalness: o.m ?? 0.05, transparent: o.t !== undefined, opacity: o.t ?? 1, side: o.side ?? THREE.FrontSide })

function canvasTex(w, h, draw) {
  if (typeof document === 'undefined') return null
  const c = document.createElement('canvas'); c.width = w; c.height = h
  draw(c.getContext('2d'), w, h)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
  return t
}

export function screenTexture(lines = ['GanoProbe', 'B1-05-04', 'AWAL! 62%']) {
  return canvasTex(512, 280, (g, w, h) => {
    g.fillStyle = '#05080a'; g.fillRect(0, 0, w, h)
    g.fillStyle = '#9fe8ff'; g.font = 'bold 34px monospace'; g.fillText(lines[0], 22, 50)
    g.font = 'bold 66px monospace'; g.fillText(lines[1], 22, 140)
    g.fillStyle = '#ffd34d'; g.font = 'bold 60px monospace'; g.fillText(lines[2], 22, 230)
  })
}
function labelTexture(text) {
  return canvasTex(512, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.fillStyle = '#e9f3ea'; g.font = 'bold 64px Arial'; g.fillText(text, 8, 84)
    g.fillStyle = '#f2b705'; g.fillRect(8, 100, 120, 10)
  })
}

/** Unit utama (genggam). Titik asal di tengah bodi. */
export function buildBody({ explode = 0, screen } = {}) {
  const g = new THREE.Group(); g.name = 'body'
  const W = 14, H = 4.6, D = 8.4
  // cangkang bawah & atas (dipisah agar bisa di-"explode")
  const bottom = new THREE.Mesh(new RoundedBoxGeometry(W, H * 0.55, D, 4, 0.9), mat(C.bodyDark))
  bottom.position.y = -H * 0.225; bottom.name = 'cangkang_bawah'; g.add(bottom)
  const topShell = new THREE.Group(); topShell.name = 'cangkang_atas'
  const top = new THREE.Mesh(new RoundedBoxGeometry(W, H * 0.5, D, 4, 0.9), mat(C.body, { t: explode ? 0.35 : undefined }))
  topShell.add(top)
  // layar OLED
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 2.85), new THREE.MeshBasicMaterial({ map: screen ?? screenTexture(), color: screen === null ? 0x05080a : 0xffffff }))
  scr.rotation.x = -Math.PI / 2; scr.position.set(-1.6, H * 0.25 + 0.035, 0); topShell.add(scr)
  const bezel = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.08, 3.4), mat(C.black, { r: 0.3 }))
  bezel.position.set(-1.6, H * 0.25 - 0.02, 0); bezel.scale.y = 0.6; topShell.add(bezel)
  // tombol ukur, LED, lubang buzzer
  const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.0, 0.45, 32), mat(C.yellow, { r: 0.35 }))
  btn.position.set(3.9, H * 0.25 + 0.2, 0.4); topShell.add(btn)
  for (const [i, col] of [[0, 0x33ff66], [1, 0xff5533]]) {
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 12), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.8 }))
    led.position.set(3.2 + i * 0.6, H * 0.25 + 0.05, -2.4); topShell.add(led)
  }
  for (let i = 0; i < 5; i++) {
    const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.05, 10), mat(C.black))
    hole.position.set(5.2 + (i % 3) * 0.35, H * 0.25 + 0.01, 1.8 + Math.floor(i / 3) * 0.35); topShell.add(hole)
  }
  const lab = labelTexture('GanoProbe')
  if (lab) {
    const l = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.05), new THREE.MeshBasicMaterial({ map: lab, transparent: true }))
    l.rotation.x = -Math.PI / 2; l.position.set(-1.7, H * 0.25 + 0.012, 2.9); topShell.add(l)
  }
  // antena GPS
  const gps = new THREE.Mesh(new RoundedBoxGeometry(2.6, 0.8, 2.6, 3, 0.3), mat(C.beige))
  gps.position.set(-5.3, H * 0.25 + 0.35, -2.2); topShell.add(gps)
  topShell.position.y = H * 0.25 + explode * 7
  g.add(topShell)
  // port USB-C
  const usb = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.35, 0.95, 2, 0.12), mat(C.black))
  usb.position.set(-W / 2 - 0.05, -0.6, 0); g.add(usb)
  return g
}

/** Isi elektronik (untuk tampilan terurai). */
export function buildInternals() {
  const g = new THREE.Group(); g.name = 'internals'
  const pcb = new THREE.Mesh(new THREE.BoxGeometry(12, 0.16, 7), mat(C.pcb, { r: 0.6 }))
  g.add(pcb)
  const esp = new THREE.Group()
  esp.add(new THREE.Mesh(new THREE.BoxGeometry(5.1, 0.25, 2.6), mat(C.black, { r: 0.4 })))
  const shield = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.3, 1.6), mat(C.metal, { m: 0.8, r: 0.3 })); shield.position.set(-1.2, 0.2, 0); esp.add(shield)
  esp.position.set(-2.6, 0.22, -1.6); esp.name = 'esp32'; g.add(esp)
  const ads = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.12, 1.7), mat(C.pcbBlue)); ads.position.set(2.8, 0.15, -2); ads.name = 'ads1115'; g.add(ads)
  const chip = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.12, 0.5), mat(C.black)); chip.position.set(2.8, 0.26, -2); g.add(chip)
  const oled = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.12, 2.8), mat(C.pcbBlue)); oled.position.set(-1.6, 0.6, 1.4); g.add(oled)
  const sd = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.2, 2.0), mat(0x6b3fa0)); sd.position.set(3.2, 0.18, 1.6); sd.name = 'microsd'; g.add(sd)
  const gpsm = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.15, 2.4), mat(C.pcbBlue)); gpsm.position.set(-4.9, 0.16, 1.9); g.add(gpsm)
  // baterai 2x18650 di bawah PCB
  for (let i = 0; i < 2; i++) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 6.5, 32), mat(C.battery, { r: 0.35 }))
    b.rotation.z = Math.PI / 2; b.position.set(-1, -1.3, -1.1 + i * 2.1); b.name = 'baterai' + i; g.add(b)
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.3, 32), mat(C.metal, { m: 0.8 }))
    cap.rotation.z = Math.PI / 2; cap.position.set(2.35, -1.3, -1.1 + i * 2.1); g.add(cap)
  }
  const bms = new THREE.Mesh(new THREE.BoxGeometry(2, 0.12, 1.4), mat(C.pcbBlue)); bms.position.set(4.3, -1.3, 0); g.add(bms)
  return g
}

/** Ruang sensor + tangkai + sungkup. Sumbu +X menuju batang pohon. */
export function buildWand({ explode = 0 } = {}) {
  const g = new THREE.Group(); g.name = 'wand'
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 22, 40), mat(C.tube, { m: 0.2, r: 0.45 }))
  tube.rotation.z = Math.PI / 2; tube.position.x = 11; g.add(tube)
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 9, 40), mat(C.grip, { r: 0.9 }))
  grip.rotation.z = Math.PI / 2; grip.position.x = 6.5; g.add(grip)
  for (let i = 0; i < 8; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.12, 8, 40), mat(C.grip, { r: 0.9 }))
    ring.rotation.y = Math.PI / 2; ring.position.x = 2.6 + i * 1.1; g.add(ring)
  }
  // ruang sensor (manifold)
  const man = new THREE.Group(); man.name = 'ruang_sensor'
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 6, 48, 1, false), mat(C.bell, { t: explode ? 0.3 : undefined }))
  shell.rotation.z = Math.PI / 2; man.add(shell)
  const capA = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 2.7, 0.4, 48), mat(C.bodyDark)); capA.rotation.z = Math.PI / 2; capA.position.x = -3; man.add(capA)
  const vents = new THREE.Mesh(new THREE.TorusGeometry(2.62, 0.08, 6, 48), mat(C.black)); vents.rotation.y = Math.PI / 2; vents.position.x = 1.8; man.add(vents)
  man.position.set(24.5, 0, 0); g.add(man)
  // sensor di dalam ruang sensor
  const sensors = new THREE.Group(); sensors.name = 'sensor_gas'
  const names = ['MQ-138', 'MQ-135', 'TGS2602']
  names.forEach((n, i) => {
    const s = new THREE.Group(); s.name = n
    const board = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 1.5), mat(i === 2 ? 0x2a2a2a : C.pcbBlue)); s.add(board)
    const can = new THREE.Mesh(new THREE.CylinderGeometry(i === 2 ? 0.5 : 0.85, i === 2 ? 0.5 : 0.85, i === 2 ? 0.6 : 1.1, 32), mat(C.metal, { m: 0.85, r: 0.35 }))
    can.position.y = 0.6; s.add(can)
    const meshTop = new THREE.Mesh(new THREE.CircleGeometry(i === 2 ? 0.45 : 0.78, 32), mat(0x555a60, { r: 0.9 }))
    meshTop.rotation.x = -Math.PI / 2; meshTop.position.y = i === 2 ? 0.91 : 1.16; s.add(meshTop)
    s.position.set(-1.8 + i * 1.8, 0, 0); sensors.add(s)
  })
  const sht = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 0.9), mat(C.pcbBlue)); sht.position.set(0.9, 0, 1.2); sht.name = 'SHT31'; sensors.add(sht)
  const fan = new THREE.Group(); fan.name = 'kipas'
  fan.add(new THREE.Mesh(new THREE.BoxGeometry(0.6, 3, 3), mat(C.black, { r: 0.7 })))
  for (let k = 0; k < 7; k++) {
    const bl = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.2, 0.35), mat(0x333333)); bl.rotation.x = (k / 7) * Math.PI * 2; bl.position.set(-0.35, Math.cos((k / 7) * Math.PI * 2) * 0.7, Math.sin((k / 7) * Math.PI * 2) * 0.7); fan.add(bl)
  }
  fan.position.set(3.4, 0, 0); sensors.add(fan)
  sensors.position.set(24.5, -0.5 - explode * 8, 0); g.add(sensors)
  // sungkup (corong) + gasket
  const bell = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 6.8, 7.5, 64, 1, true), mat(C.bell, { side: THREE.DoubleSide, r: 0.5 }))
  bell.rotation.z = Math.PI / 2; bell.position.x = 31.25; bell.name = 'sungkup'; g.add(bell)
  const gasket = new THREE.Mesh(new THREE.TorusGeometry(6.8, 0.75, 24, 72), mat(C.gasket, { r: 0.95 }))
  gasket.rotation.y = Math.PI / 2; gasket.position.x = 35.1; gasket.name = 'gasket'; g.add(gasket)
  const grill = new THREE.Group()
  for (let k = 0; k < 6; k++) { const bar = new THREE.Mesh(new THREE.BoxGeometry(0.15, 5.2, 0.25), mat(C.black)); bar.rotation.x = (k / 6) * Math.PI; grill.add(bar) }
  grill.add(new THREE.Mesh(new THREE.TorusGeometry(2.55, 0.15, 8, 40).rotateY(Math.PI / 2), mat(C.black)))
  grill.position.x = 27.8; g.add(grill)
  return g
}

/** Probe tanah kapasitif + DS18B20 dengan kabel spiral. */
export function buildSoilProbe(cableTo) {
  const g = new THREE.Group(); g.name = 'probe_tanah'
  const blade = new THREE.Mesh(new THREE.BoxGeometry(2.3, 10, 0.18), mat(0x1c1c1c, { r: 0.4 })); blade.position.y = -5; g.add(blade)
  const tip = new THREE.Mesh(new THREE.ConeGeometry(1.15, 1.2, 4), mat(0x1c1c1c)); tip.rotation.y = Math.PI / 4; tip.rotation.z = Math.PI; tip.scale.z = 0.12; tip.position.y = -10.6; g.add(tip)
  const head = new THREE.Mesh(new RoundedBoxGeometry(3, 2.4, 1.4, 3, 0.35), mat(C.yellow, { r: 0.45 })); head.position.y = 1.2; g.add(head)
  const temp = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 5, 16), mat(C.metal, { m: 0.9, r: 0.3 })); temp.position.set(1.8, -2.5, 0); g.add(temp)
  if (cableTo) {
    const pts = []
    const a = new THREE.Vector3(0, 2.4, 0), b = cableTo
    for (let i = 0; i <= 200; i++) {
      const t = i / 200
      const p = a.clone().lerp(b, t)
      p.y += Math.sin(t * Math.PI) * 6
      const coil = t > 0.2 && t < 0.8 ? 0.7 : 0
      p.x += Math.cos(t * 60) * coil; p.z += Math.sin(t * 60) * coil
      pts.push(p)
    }
    const cable = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 400, 0.18, 8), mat(0x151515, { r: 0.7 }))
    g.add(cable)
  }
  return g
}

export function buildProbe({ explode = 0, screen } = {}) {
  const g = new THREE.Group()
  const body = buildBody({ explode, screen }); g.add(body)
  if (explode) { const int = buildInternals(); int.position.y = 0.2 + explode * 2.5; g.add(int) }
  const wand = buildWand({ explode }); wand.position.x = 6.6; g.add(wand)
  return g
}
