import express from 'express'
import morgan from 'morgan'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import hlsRouter from './web/hls.routes.js'
import uploadRouter from './web/upload.routes.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export async function createServer() {
  const app = express()

  // logging
  app.use(morgan('dev'))

  // health
  app.get('/health', (_req, res) => {
    res.json({ ok: true })
  })

  // ensure storage directories exist
  const storageDir = process.env.STORAGE_PATH || path.join(__dirname, '..', 'storage')
  const uploadsDir = path.join(storageDir, 'uploads')
  const transcodeDir = path.join(storageDir, 'transcoded')
  for (const dir of [storageDir, uploadsDir, transcodeDir]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  }

  // routes
  app.use('/upload', uploadRouter)
  app.use('/videos', hlsRouter)

  // not found
  app.use((_req, res) => res.status(404).json({ error: 'Not Found' }))

  return app
}
