import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = resolve(fileURLToPath(new URL('.', import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(resolve(rootDir, 'package.json'), 'utf-8'))
const version = pkg.version || '0.0.0'
const buildTime = new Date().toISOString()
const outPath = resolve(rootDir, 'public', 'version.json')

mkdirSync(dirname(outPath), { recursive: true })
writeFileSync(outPath, `${JSON.stringify({ version, buildTime }, null, 2)}\n`, 'utf-8')
console.log(`Wrote ${outPath} (${version})`)
