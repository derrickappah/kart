import { createServiceRoleClient } from '@/utils/supabase/server';
import RefundRequestsClient from './RefundRequestsClient';

export const dynamic = 'force-dynamic';

export default async function RefundRequestsPage() {
    const supabase = createServiceRoleClient();

    let requests = [];
    let pageNotice = null;

    try {
        let hasTable = true;
        // 1. Try fetching from refund_requests table
        const { data: rawRequests, error: reqErr } = await supabase
            .from('refund_requests')
            .select('*')
            .order('created_at', { ascending: false });

        if (reqErr) {
            hasTable = false;
            console.warn('Notice: refund_requests table not available:', reqErr.message);
        } else {
            requests = rawRequests || [];
        }

        // 2. Query orders table for any orders with refund status requested/refunded/rejected
        const existingOrderIds = new Set(requests.map(r => r.order_id));
        const { data: disputedOrders } = await supabase
            .from('orders')
            .select('id, buyer_id, created_at, status, total_amount, escrow_status, refund_status')
            .in('refund_status', ['Requested', 'Refunded', 'Rejected']);

        if (disputedOrders && disputedOrders.length > 0) {
            const missingOrders = disputedOrders.filter(o => !existingOrderIds.has(o.id));

            for (const order of missingOrders) {
                // Try to extract reason/description from order history notes
                const { data: history } = await supabase
                    .from('order_status_history')
                    .select('notes, created_at')
                    .eq('order_id', order.id)
                    .ilike('notes', '%requested a refund%')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                let reason = 'Item not received';
                let description = history?.notes || 'Refund requested by buyer';

                if (history?.notes) {
                    const reasonMatch = history.notes.match(/Reason:\s*([^.]+)/i);
                    if (reasonMatch && reasonMatch[1]) {
                        reason = reasonMatch[1].trim();
                    }
                }

                const calculatedStatus = order.refund_status === 'Requested' ? 'Pending' 
                    : order.refund_status === 'Refunded' ? 'Approved' : 'Rejected';

                let insertedRequest = null;
                // If table exists, auto-heal DB row
                if (hasTable) {
                    const { data: inserted } = await supabase
                        .from('refund_requests')
                        .insert({
                            order_id: order.id,
                            buyer_id: order.buyer_id,
                            reason: reason,
                            description: description,
                            status: calculatedStatus
                        })
                        .select()
                        .maybeSingle();
                    insertedRequest = inserted;
                }

                requests.push(insertedRequest || {
                    id: order.id, // Use order.id as fallback requestId
                    order_id: order.id,
                    buyer_id: order.buyer_id,
                    reason: reason,
                    description: description,
                    status: calculatedStatus,
                    created_at: history?.created_at || order.created_at,
                    updated_at: order.created_at
                });
            }
        }

        // 3. Manually populate relational data for profiles, orders, and products safely
        if (requests.length > 0) {
            const buyerIds = [...new Set(requests.map(r => r.buyer_id).filter(Boolean))];
            const orderIds = [...new Set(requests.map(r => r.order_id).filter(Boolean))];

            const [buyersResult, ordersResult] = await Promise.all([
                buyerIds.length > 0 ? supabase.from('profiles').select('id, display_name, email').in('id', buyerIds) : { data: [] },
                orderIds.length > 0 ? supabase.from('orders').select('id, total_amount, status, escrow_status, product_id').in('id', orderIds) : { data: [] }
            ]);

            const buyersMap = new Map((buyersResult.data || []).map(b => [b.id, b]));
            const ordersMap = new Map((ordersResult.data || []).map(o => [o.id, o]));

            const productIds = [...new Set((ordersResult.data || []).map(o => o.product_id).filter(Boolean))];
            const productsResult = productIds.length > 0
                ? await supabase.from('products').select('id, title').in('id', productIds)
                : { data: [] };
            const productsMap = new Map((productsResult.data || []).map(p => [p.id, p]));

            requests = requests.map(r => {
                const orderObj = ordersMap.get(r.order_id);
                const productObj = orderObj ? productsMap.get(orderObj.product_id) : null;

                return {
                    ...r,
                    buyer: buyersMap.get(r.buyer_id) || null,
                    order: orderObj ? {
                        ...orderObj,
                        product: productObj || null
                    } : null
                };
            });
        }
    } catch (e) {
        console.error('RefundRequestsPage unexpected error:', e);
        pageNotice = e.message || 'Failed to load refund requests';
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-black tracking-tighter">Refund Disputes</h1>
                <p className="text-xs font-bold text-[#4b636c] dark:text-gray-400 uppercase tracking-widest">
                    Manage buyer refund requests and resolve order issues
                </p>
            </div>

            {pageNotice && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-2xl text-xs font-bold flex items-center gap-3">
                    <span>Notice: {pageNotice}</span>
                </div>
            )}

            <RefundRequestsClient initialRequests={requests} />
        </div>
    );
}
