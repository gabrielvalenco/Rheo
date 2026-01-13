import { Worker } from 'bullmq'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import { ensureBucket, bucketName, minio } from '../services/minio.js'

const connection = { url: process.env.REDIS_URL || 'redis://redis:6379' }

function runFFmpeg(input, outDir) {
  return new Promise((resolve, reject) => {
    const args = [
      '-y',
      '-i', input,
      '-filter_complex', '[0:v]split=3[v1][v2][v3];[v1]scale=-2:360[v1out];[v2]scale=-2:720[v2out];[v3]scale=-2:1080[v3out]',
      '-map', '[v1out]', '-map', '0:a?', '-c:v', 'libx264', '-b:v', '800k', '-c:a', 'aac', '-b:a', '96k', '-f', 'hls', '-hls_time', '4', '-hls_playlist_type', 'vod', '-hls_segment_filename', path.join(outDir, '360p_%03d.ts'), path.join(outDir, '360p.m3u8'),
      '-map', '[v2out]', '-map', '0:a?', '-c:v', 'libx264', '-b:v', '2000k', '-c:a', 'aac', '-b:a', '128k', '-f', 'hls', '-hls_time', '4', '-hls_playlist_type', 'vod', '-hls_segment_filename', path.join(outDir, '720p_%03d.ts'), path.join(outDir, '720p.m3u8'),
      '-map', '[v3out]', '-map', '0:a?', '-c:v', 'libx264', '-b:v', '5000k', '-c:a', 'aac', '-b:a', '192k', '-f', 'hls', '-hls_time', '4', '-hls_playlist_type', 'vod', '-hls_segment_filename', path.join(outDir, '1080p_%03d.ts'), path.join(outDir, '1080p.m3u8')
    ]
    const ff = spawn('ffmpeg', args)
    ff.stderr.on('data', d => process.stdout.write(d))
    ff.on('error', reject)
    ff.on('close', code => {
      if (code === 0) resolve()
      else reject(new Error(`ffmpeg exited with ${code}`))
    })
  })
}

async function uploadFolderToMinio(localDir, remotePrefix) {
  await ensureBucket()
  const files = fs.readdirSync(localDir)
  for (const f of files) {
    const fp = path.join(localDir, f)
    const key = `${remotePrefix}/${f}`
    await minio.fPutObject(bucketName(), key, fp)
  }
}

export const worker = new Worker('video-transcode', async job => {
  const { id, inputPath } = job.data
  const outBase = path.join(process.env.STORAGE_PATH || path.join(process.cwd(), 'storage'), 'transcoded', id, 'hls')
  fs.mkdirSync(outBase, { recursive: true })
  await runFFmpeg(inputPath, outBase)
  await uploadFolderToMinio(outBase, `${id}/hls`)
}, { connection })

worker.on('completed', job => {
  console.log(`Job ${job.id} concluído`)
})

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} falhou:`, err?.message)
})

