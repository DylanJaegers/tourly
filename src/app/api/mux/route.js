import { NextResponse } from 'next/server'
import Mux from '@mux/mux-node'

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID,
  tokenSecret: process.env.MUX_TOKEN_SECRET,
})

export async function POST(request) {
  try {
    const { videoType } = await request.json()

    const upload = await mux.video.uploads.create({
      cors_origin: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      new_asset_settings: {
        playback_policy: ['public'],
        encoding_tier: 'baseline',
        video_quality: 'basic',
      },
    })

    return NextResponse.json({
      uploadId: upload.id,
      uploadUrl: upload.url,
      videoType,
    })
  } catch (error) {
    console.error('Mux upload error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
