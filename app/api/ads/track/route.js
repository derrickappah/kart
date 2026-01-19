import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { advertisementId, eventType } = body;

    if (!advertisementId || !eventType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['view', 'click'].includes(eventType)) {
      return NextResponse.json({ error: 'Invalid event type' }, { status: 400 });
    }

    // Get user if authenticated
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || null;

    // Create campaign event
    const { error: trackError } = await supabase
      .from('ad_campaigns')
      .insert({
        advertisement_id: advertisementId,
        event_type: eventType,
        user_id: userId,
      });

    if (trackError) {
      console.error('Error tracking ad event:', trackError);
      return NextResponse.json({ error: 'Failed to track event' }, { status: 500 });
    }

    // Update advertisement stats
    const updateField = eventType === 'view' ? 'views' : 'clicks';
    const { error: updateError } = await supabase.rpc('increment_ad_stat', {
      ad_id: advertisementId,
      stat_field: updateField,
    });

    // If RPC doesn't exist, use direct update
    if (updateError) {
      const { data: ad } = await supabase
        .from('advertisements')
        .select(updateField)
        .eq('id', advertisementId)
        .single();

      if (ad) {
        await supabase
          .from('advertisements')
          .update({
            [updateField]: (ad[updateField] || 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', advertisementId);
      }
    }

    return NextResponse.json({ message: 'Event tracked successfully' });
  } catch (error) {
    console.error('Track ad event error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
