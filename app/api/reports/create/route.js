import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { productId, reportedUserId, reason, description } = body;

    if ((!productId && !reportedUserId) || !reason) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create report
    const { error } = await supabase
      .from('reports')
      .insert({
        reporter_id: user.id,
        product_id: productId || null,
        reported_user_id: reportedUserId || null,
        reason,
        description: description || null,
        status: 'Pending',
      });

    if (error) {
      console.error('Error creating report:', error);
      return NextResponse.json({ error: 'Failed to create report' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Report submitted successfully' });
  } catch (error) {
    console.error('Create report error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
