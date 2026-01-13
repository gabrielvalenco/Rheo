import { Queue } from 'bullmq'

const connection = {
  url: process.env.REDIS_URL || 'redis://redis:6379'
}

export const videoTranscodeQueue = new Queue('video-transcode', { connection })

