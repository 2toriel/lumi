import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

const VALID_COLORS = ['coral', 'marigold', 'teal', 'violet', 'pink'];

export async function POST(request, { params }) {
  const { slug } = await params;
  const supabase = getSupabaseAdmin();

  const { data: cake, error: cakeError } = await supabase
    .from('cakes')
    .select('id, celebration_date')
    .eq('slug', slug)
    .single();

  if (cakeError || !cake) {
    return NextResponse.json({ error: 'Cake not found.' }, { status: 404 });
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Expected multipart form data.' }, { status: 400 });
  }

  const senderName = (form.get('senderName') || '').toString().trim();
  const rawColor = (form.get('color') || '').toString();
  const color = VALID_COLORS.includes(rawColor) ? rawColor : 'coral';
  const messageType = (form.get('messageType') || '').toString();
  const message = (form.get('message') || '').toString().trim();
  const audioFile = form.get('audio');

  if (!senderName) {
    return NextResponse.json({ error: 'senderName is required.' }, { status: 400 });
  }
  if (!['text', 'voice'].includes(messageType)) {
    return NextResponse.json({ error: 'messageType must be "text" or "voice".' }, { status: 400 });
  }
  if (messageType === 'text' && !message) {
    return NextResponse.json({ error: 'message is required for a text wish.' }, { status: 400 });
  }
  if (messageType === 'voice' && !(audioFile instanceof Blob)) {
    return NextResponse.json({ error: 'An audio recording is required for a voice wish.' }, { status: 400 });
  }

  let voiceUrl = null;

  if (messageType === 'voice') {
    const arrayBuffer = await audioFile.arrayBuffer();
    const fileName = `${cake.id}/${Date.now()}-${Math.round(Math.random() * 1e6)}.webm`;

    const { error: uploadError } = await supabase.storage
      .from('voice-notes')
      .upload(fileName, Buffer.from(arrayBuffer), {
        contentType: audioFile.type || 'audio/webm',
      });

    if (uploadError) {
      return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
    }

    const { data: pub } = supabase.storage.from('voice-notes').getPublicUrl(fileName);
    voiceUrl = pub.publicUrl;
  }

  const { data: candle, error: insertError } = await supabase
    .from('candles')
    .insert({
      cake_id: cake.id,
      sender_name: senderName,
      color,
      message_type: messageType,
      message: messageType === 'text' ? message : null,
      voice_url: voiceUrl,
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ candle }, { status: 201 });
}
