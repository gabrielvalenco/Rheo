# Servidor de Streaming de Vídeo (HLS) com Node, MinIO, FFmpeg e BullMQ

## Visão Geral
Este projeto implementa uma API estilo Netflix/YouTube que:
- Recebe upload de vídeos via stream sem carregar na RAM
- Enfileira processamento em background (BullMQ/Redis)
- Converte para HLS com três qualidades: 360p, 720p e 1080p (FFmpeg)
- Publica playlists e segmentos no MinIO (compatível com S3)
- Serve HLS e segmentos com suporte a Range (HTTP 206 Partial Content)

## Stack
- Node.js + Express
- FFmpeg (instalado no container da API)
- BullMQ (Redis)
- MinIO (S3 compatível)

## Subir Localmente com Docker

1. Crie as pastas de dados:
```
mkdir storage minio-data
```

2. Suba os serviços:
```
docker compose up -d --build
```

3. Endpoints:
- `POST http://localhost:3000/upload` com `multipart/form-data` campo `file`
- Após processado: 
  - `GET http://localhost:3000/videos/:id/hls/master.m3u8`
  - `GET http://localhost:3000/videos/:id/hls/360p.m3u8`
  - `GET http://localhost:3000/videos/:id/hls/720p.m3u8`
  - `GET http://localhost:3000/videos/:id/hls/1080p.m3u8`
  - Segmentos via `GET http://localhost:3000/videos/:id/hls/<segmento.ts>`

## Fluxo
1. Upload: `Busboy` faz stream do arquivo para disco (`storage/uploads/<id>.mp4`)
2. Enqueue: cria job na fila `video-transcode`
3. Worker: roda `ffmpeg` gerando HLS (m3u8 + ts) em diretório temporário
4. Publicação: faz upload de todos os arquivos para MinIO em `videos/<id>/hls/*`
5. Streaming: a API lê direto do MinIO e responde com Range/206 quando solicitado

## Variáveis de Ambiente
Veja `.env.example`. Em Docker, já são definidas no `docker-compose.yml`.

## Observações
- O worker é inicializado junto com a API para simplicidade.
- Para DASH, bastaria alterar o comando do FFmpeg e rotas de publicação.
- Em produção, sugere-se separar API e Worker em processos/containers distintos.

