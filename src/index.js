import dotenv from 'dotenv'
import { createServer } from './server.js'
import './workers/videoTranscode.worker.js'

dotenv.config()

const PORT = process.env.PORT || 3000

const app = await createServer()

app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT}`)
})
