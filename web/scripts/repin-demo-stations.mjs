import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Percent x/y on the Udenbreth pixel festival map (0,0 = top-left). */
const MAP_COORDS = [
  [18, 82], [38, 52], [86, 50], [50, 64], [28, 30], [12, 38], [54, 60], [90, 62], [70, 74], [24, 90],
  [34, 76], [88, 30], [52, 66], [44, 58], [40, 66], [58, 46], [76, 70], [50, 52], [46, 40], [48, 56],
  [62, 54], [72, 82], [74, 86], [76, 84], [80, 72], [20, 72], [50, 48], [35, 44], [65, 48], [42, 72],
  [55, 72], [30, 60], [60, 38], [25, 50], [70, 50], [85, 44], [15, 70], [45, 78], [55, 40], [38, 35],
  [65, 65], [58, 78], [32, 55], [48, 35], [22, 45], [92, 55], [68, 58], [52, 82], [40, 80], [42, 22],
]

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const path = join(root, 'data', 'demo-stations.json')
const data = JSON.parse(readFileSync(path, 'utf8'))

for (const station of data.stations) {
  const [x, y] = MAP_COORDS[station.field - 1]
  if (x == null) throw new Error(`No coords for field ${station.field}`)
  station.map = { x, y }
}

writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`)
console.log(`Updated map pins for ${data.stations.length} stations in demo-stations.json`)
