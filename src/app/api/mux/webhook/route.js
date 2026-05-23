import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const runtime = 'nodejs'

export async function POST(request) {
  try {
    const body = await request.json()
    const { type, data } = body

    console.log('Mux webhook received:', type)

    if (type === 'video.upload.asset_created') {
      const uploadId = data.id
      const assetId = data.asset_id

      await supabaseAdmin
        .from('listing_videos')
        .update({ mux_asset_id: assetId })
        .eq('mux_asset_id', uploadId)

      console.log('Mapped upload ID to asset ID:', uploadId, '->', assetId)
    }

    if (type === 'video.asset.ready') {
      const assetId = data.id
      const playbackId = data.playback_ids?.[0]?.id

      if (!playbackId) {
        return NextResponse.json({ error: 'No playback ID' }, { status: 400 })
      }

      await supabaseAdmin
        .from('listing_videos')
        .update({
          mux_playback_id: playbackId,
          duration_seconds: Math.round(data.duration || 0),
        })
        .eq('mux_asset_id', assetId)

      console.log('Playback ID saved:', playbackId)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}