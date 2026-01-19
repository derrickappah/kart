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
    const { studentId, studentIdImage } = body;

    if (!studentId || !studentIdImage) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create verification request
    const { error } = await supabase
      .from('verification_requests')
      .insert({
        user_id: user.id,
        student_id: studentId,
        student_id_image: studentIdImage,
        status: 'Pending',
      });

    if (error) {
      console.error('Error creating verification request:', error);
      return NextResponse.json({ error: 'Failed to submit verification request' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Verification request submitted successfully' });
  } catch (error) {
    console.error('Verification request error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
