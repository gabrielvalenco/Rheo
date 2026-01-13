import { Router } from 'express'
import { minio, bucketName } from '../services/minio.js'

const router = Router()

router.get('/:id/hls/master.m3u8', async (req, res) => {
  const id = req.params.id
  // build a simple master playlist
  const master = `#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1000000,RESOLUTION=640x360\n360p.m3u8\n#EXT-X-STREAM-INF:BANDWIDTH=2500000,RESOLUTION=1280x720\n720p.m3u8\n#EXT-X-STREAM-INF:BANDWIDTH=5500000,RESOLUTION=1920x1080\n1080p.m3u8\n`
  res.setHeader('Content-Type', 'application/vnd.apple.mpegurl')
  res.send(master)
})

router.get('/:id/hls/:file', async (req, res) => {
  const { id, file } = req.params
  const key = `${id}/hls/${file}`

  // stat object to get size
  let stat
  try {
    stat = await minio.statObject(bucketName(), key)
  } catch (e) {
    return res.status(404).json({ error: 'Arquivo não encontrado' })
  }

  const range = req.headers.range
  if (range) {
    const match = /bytes=(\d+)-(\d+)?/.exec(range)
    if (match) {
      const start = parseInt(match[1], 10)
      const end = match[2] ? parseInt(match[2], 10) : stat.size - 1
      const length = end - start + 1
      const stream = await minio.getPartialObject(bucketName(), key, start, length)
      res.status(206)
      res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`)
      res.setHeader('Accept-Ranges', 'bytes')
      res.setHeader('Content-Length', length)
      res.setHeader('Content-Type', contentTypeFor(file))
      stream.pipe(res)
      return
    }
  }

  // full stream
  const stream = await minio.getObject(bucketName(), key)
  res.setHeader('Content-Length', stat.size)
  res.setHeader('Accept-Ranges', 'bytes')
  res.setHeader('Content-Type', contentTypeFor(file))
  stream.pipe(res)
})

function contentTypeFor(name) {
  if (name.endsWith('.m3u8')) return 'application/vnd.apple.mpegurl'
  if (name.endsWith('.ts')) return 'video/mp2t'
  if (name.endsWith('.m4s')) return 'video/iso.segment'
  return 'application/octet-stream'
}

export default router
