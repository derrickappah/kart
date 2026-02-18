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
        const { reason } = body;

        // Check if user already has a deletion request
        const { data: existingRequest, error: checkError } = await supabase
            .from('account_deletion_requests')
            .select('id, status')
            .eq('user_id', user.id)
            .maybeSingle();

        if (checkError) {
            console.error('Error checking existing request:', checkError);
            return NextResponse.json(
                { error: 'Failed to check existing request' },
                { status: 500 }
            );
        }

        // If a pending or approved request already exists, prevent duplicate
        if (existingRequest) {
            if (existingRequest.status === 'pending') {
                return NextResponse.json(
                    { error: 'You already have a pending deletion request' },
                    { status: 409 }
                );
            }
            if (existingRequest.status === 'approved') {
                return NextResponse.json(
                    { error: 'Your account deletion has already been approved' },
                    { status: 409 }
                );
            }
            // If status is 'rejected', allow creating a new request
            // First delete the old rejected request
            const { error: deleteError } = await supabase
                .from('account_deletion_requests')
                .delete()
                .eq('id', existingRequest.id);

            if (deleteError) {
                console.error('Error deleting old request:', deleteError);
                return NextResponse.json(
                    { error: 'Failed to process request' },
                    { status: 500 }
                );
            }
        }

        // Create new deletion request
        const { data: deletionRequest, error: insertError } = await supabase
            .from('account_deletion_requests')
            .insert({
                user_id: user.id,
                email: user.email,
                reason: reason || null,
                status: 'pending'
            })
            .select()
            .single();

        if (insertError) {
            console.error('Error creating deletion request:', insertError);
            return NextResponse.json(
                { error: `Failed to create deletion request: ${insertError.message}` },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            request: deletionRequest
        });
    } catch (error) {
        console.error('Deletion request error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to process deletion request' },
            { status: 500 }
        );
    }
}

// GET endpoint to check deletion request status
export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: deletionRequest, error } = await supabase
            .from('account_deletion_requests')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

        if (error) {
            console.error('Error fetching deletion request:', error);
            return NextResponse.json(
                { error: 'Failed to fetch deletion request' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            request: deletionRequest
        });
    } catch (error) {
        console.error('Deletion request fetch error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch deletion request' },
            { status: 500 }
        );
    }
}
