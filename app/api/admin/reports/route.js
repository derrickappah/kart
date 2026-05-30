import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/utils/supabase/server';

export async function POST(request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', user.id)
            .single();

        if (!profile || !profile.is_admin) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { reportId, status } = body;

        if (!reportId) {
            return NextResponse.json({ error: 'Report ID is required' }, { status: 400 });
        }

        if (!status || !['Resolved', 'Dismissed'].includes(status)) {
            return NextResponse.json({ error: 'Valid status (Resolved or Dismissed) is required' }, { status: 400 });
        }

        // Use service role client to bypass RLS for administrative updates if needed
        let adminSupabase;
        try {
            adminSupabase = createServiceRoleClient();
        } catch (serviceRoleError) {
            console.error('Service role client not available, falling back to regular client:', serviceRoleError);
            adminSupabase = supabase;
        }

        // Get report details before updating
        const { data: report, error: reportError } = await adminSupabase
            .from('reports')
            .select('*')
            .eq('id', reportId)
            .single();

        if (reportError || !report) {
            return NextResponse.json({ error: 'Report not found' }, { status: 404 });
        }

        // Update the report status
        const { error: updateError } = await adminSupabase
            .from('reports')
            .update({
                status,
                updated_at: new Date().toISOString()
            })
            .eq('id', reportId);

        if (updateError) {
            console.error('Error updating report status:', updateError);
            return NextResponse.json({ error: 'Failed to update report status' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: `Report successfully marked as ${status}` });
    } catch (error) {
        console.error('Error in reports admin route:', error);
        return NextResponse.json(
            { error: error.message || 'Server error' },
            { status: 500 }
        );
    }
}
