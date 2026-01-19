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
    const { display_name, email, campus } = body;

    // Build update payload - handle empty strings properly
    const updatePayload = {};
    
    if (display_name !== undefined) {
      updatePayload.display_name = (typeof display_name === 'string' && display_name.trim()) || null;
    }
    if (email !== undefined) {
      // Email should be a valid email or null
      const emailValue = (typeof email === 'string' && email.trim()) || null;
      // Basic email validation if provided
      if (emailValue && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        );
      }
      updatePayload.email = emailValue;
    }
    if (campus !== undefined) {
      updatePayload.campus = (typeof campus === 'string' && campus.trim()) || null;
    }

    // Ensure we have at least one field to update
    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Update profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', user.id)
      .select()
      .single();

    if (profileError) {
      console.error('Error updating profile:', profileError);
      return NextResponse.json(
        { error: `Failed to update profile: ${profileError.message}` },
        { status: 500 }
      );
    }

    // Update user metadata if display_name was provided and is not null
    if (display_name !== undefined && updatePayload.display_name) {
      const { error: metadataError } = await supabase.auth.updateUser({
        data: { full_name: updatePayload.display_name }
      });

      if (metadataError) {
        console.error('Error updating user metadata:', metadataError);
        // Don't fail the request, profile was updated
      }
    }

    return NextResponse.json({
      success: true,
      profile: profile,
    });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update profile' },
      { status: 500 }
    );
  }
}
