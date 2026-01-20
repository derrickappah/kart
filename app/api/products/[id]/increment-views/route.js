import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request, { params }) {
    try {
        const { id } = await params;
        const supabase = await createClient();

        const { error } = await supabase.rpc('increment_product_views', { product_id: id });

        if (error) {
            console.error('Error incrementing views:', error);
            return NextResponse.json({ error: 'Failed to increment views' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('View increment error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
