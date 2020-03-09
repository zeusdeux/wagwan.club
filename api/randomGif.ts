import { IncomingMessage, ServerResponse } from 'http'
import bent from 'bent'

interface TenorSearchItemMedia {
  tinygif?: {
    url: string
    dims: [number, number]
    preview: string
    size: number
  }
  gif?: {
    url: string
    dims: [number, number]
    preview: string
    size: number
  }
  mp4?: {
    url: string
    dims: [number, number]
    duration: number
    preview: string
    size: number
  }
}

interface TenorSearchItem {
  tags: string[]
  url: string
  media: TenorSearchItemMedia[]
  created: number
  shares: number
  itemurl: number
  hasaudio: boolean
  title: string
  id: string
}

interface TenorSearchResponse {
  weburl: string
  results: TenorSearchItem[]
  next: string
}

async function getFromTenor(
  query: string
): Promise<null | {
  width: number
  height: number
  title?: string
  src: string
  type: 'video' | 'image'
}> {
  const getJSON = bent('json')
  const gifs = (await getJSON(
    `https://api.tenor.com/v1/search?key=${process.env.TENOR_API_KEY}&q=${encodeURIComponent(
      query
    )}&locale=en&contentfilter=low&media_filter=minimal`
  )) as TenorSearchResponse
  const count = gifs.results.length

  if (count) {
    const index = Math.floor((Math.random() * 10 ** count.toString().split('').length) % count)
    const chosenResult = gifs.results[index]
    const chosenMedia = chosenResult.media[0]

    if (chosenMedia.mp4) {
      return {
        type: 'video',
        src: chosenMedia.mp4.url,
        width: chosenMedia.mp4.dims[0],
        height: chosenMedia.mp4.dims[1]
      }
    }

    if (chosenMedia.gif) {
      return {
        type: 'image',
        src: chosenMedia.gif.url,
        width: chosenMedia.gif.dims[0],
        height: chosenMedia.gif.dims[1],
        title: chosenResult.title
      }
    }

    if (chosenMedia.tinygif) {
      return {
        type: 'image',
        src: chosenMedia.tinygif.url,
        width: chosenMedia.tinygif.dims[0],
        height: chosenMedia.tinygif.dims[1],
        title: chosenResult.title
      }
    }
  }

  return null
}

export default async function(_: IncomingMessage, res: ServerResponse) {
  const tenorResult = await getFromTenor('top boy')
  let response = '<h1>Something ain’t right fam..</h1>',
    statusCode = 500

  if (!tenorResult) {
    response = '<h1>Wagwan fam!</h1><p>Could not find you a Top Boy gif though.<p>'
    statusCode = 404
  }

  if (tenorResult) {
    const { src, type, title } = tenorResult

    if (type === 'video') {
      response = `
<video autoplay loop muted>
  <source src="${src}" type="video/mp4">
  Sorry, your browser cannot play embedded videos.
</video>
`
      statusCode = 200
    }

    if (type === 'image') {
      response = `<img src="${src}" alt="${title ?? 'TV show Top Boy related gif'}"/>`
      statusCode = 200
    }
  }

  response = `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8"/>
    <title>wagwaaan!</title>
    <style>
      html, body {
        margin: 0;
        padding: 0;
        font-family: sans-serif;
        color: #f3f3f3;
      }
      body {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        background-color: #000;
      }
      img, video {
        width: 100vw;
      }
    </style>
  </head>
  <body>
    ${response}
  </body>
</html>
`
  res.writeHead(statusCode, {
    'Content-Type': 'text/html',
    'Content-Length': Buffer.byteLength(response, 'utf-8')
  })
  res.end(response)
}
