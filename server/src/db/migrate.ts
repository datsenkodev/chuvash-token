import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { pool } from './pool.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export async function migrate() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8')
  await pool.query(schema)
  const patches = fs.readFileSync(path.join(__dirname, 'patches.sql'), 'utf-8')
  await pool.query(patches)
  console.log('Migration complete')
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  migrate()
    .then(() => process.exit(0))
    .catch(e => {
      console.error(e)
      process.exit(1)
    })
}
