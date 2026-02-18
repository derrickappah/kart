import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // If no user, just query existing. If user, try to insert dummy.

    const { data: existingStatuses, error: statusError } = await supabase
        .from('subscriptions')
        .select('status');

    let statuses = [];
    if (existingStatuses) {
        statuses = [...new Set(existingStatuses.map(s => s.status))];
    }

    // Try to find the check constraint definition
    const { data: constraints, error: constraintError } = await supabase
        .rpc('get_check_constraints', { table_name: 'subscriptions' });

    return NextResponse.json({
        existing_statuses: statuses,
        constraint_rpc_error: constraintError,
        constraints: constraints,
        user_id: user?.id
    });
}
