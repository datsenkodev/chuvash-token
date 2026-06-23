import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const files = ['schema.sql', 'patches.sql']

for (const file of files) {
  const from = path.join(root, 'server', 'src', 'db', file)
  const to = path.join(root, 'server', 'dist', 'db', file)
  fs.mkdirSync(path.dirname(to), { recursive: true })
  fs.copyFileSync(from, to)
  console.log(`Copied ${file} → server/dist/db/`)
}
