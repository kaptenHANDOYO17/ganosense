// Ekspor bagian cetak 3D (satuan mm): sungkup (corong) dan rumah ruang sensor.
import * as THREE from 'three'
import { STLExporter } from 'three/addons/exporters/STLExporter.js'
import fs from 'fs'
const ex = new STLExporter()
const lathe = (pts) => new THREE.Mesh(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 96))
// profil tertutup (dinding 2,5 mm): leher Ø52 mm, mulut Ø136 mm, tinggi 75 mm, bibir gasket 6 mm
const t = 2.5
const sungkup = lathe([[26, 0], [26, 12], [68, 75], [74, 75], [74, 75 + t], [68 - t, 75 + t], [26 - t, 12], [26 - t, 0], [26, 0]])
fs.writeFileSync('sungkup_GanoProbe.stl', ex.parse(sungkup, { binary: false }))
// rumah ruang sensor: tabung Ø52 x 60 mm, dinding 2,5 mm, dudukan pipa PVC 1" di satu sisi
const rumah = lathe([[26, 0], [26, 60], [26 - t, 60], [26 - t, 3], [17, 3], [17, 0], [26, 0]])
fs.writeFileSync('rumah_ruang_sensor.stl', ex.parse(rumah, { binary: false }))
console.log('STL ok')
