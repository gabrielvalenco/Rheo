import { Router } from 'express'
import Busboy from 'busboy'
import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'
import { videoTranscodeQueue } from '../queue/queue.js'

const router = Router()

router.post('/', async (req, res) => {
  const id = uuidv4()
  const uploadsDir = path.join(process.env.STORAGE_PATH || path.join(process.cwd(), 'storage'), 'uploads')
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })
  const targetPath = path.join(uploadsDir, `${id}.mp4`)

  const bb = Busboy({ headers: req.headers })
  let saved = false
  let mime = null

  bb.on('file', (_name, file, info) => {
    mime = info.mimeType
    const writeStream = fs.createWriteStream(targetPath)
    file.pipe(writeStream)
    writeStream.on('finish', () => {
      saved = true
    })
  })

  bb.on('close', async () => {
    if (!saved) {
      return res.status(400).json({ error: 'Arquivo não recebido' })
    }
    await videoTranscodeQueue.add('transcode', { id, inputPath: targetPath, mime })
    res.status(202).json({ id, status: 'queued' })
  })

  req.pipe(bb)
})

export default router
