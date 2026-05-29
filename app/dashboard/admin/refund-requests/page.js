import { createServiceRoleClient } from '@/utils/supabase/server';
import RefundRequestsClient from './RefundRequestsClient';

export const dynamic = 'force-dynamic';

export default async function RefundRequestsPage() {
    const supabase = createServiceRoleClient();

    const { data: requests, error } = await supabase
        .from('refund_requests')
        .select(`
            *,
            buyer:profiles!buyer_id(display_name, email),
            order:orders(
                id, 
                total_amount, 
                status, 
                escrow_status,
                product:products(title)
            )
        `)
        .order('created_at', { ascending: false });

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-black tracking-tighter">Refund Disputes</h1>
                <p className="text-xs font-bold text-[#4b636c] dark:text-gray-400 uppercase tracking-widest">
                    Manage buyer refund requests and resolve order issues
                </p>
            </div>

            <RefundRequestsClient initialRequests={requests || []} />
        </div>
    );
}
