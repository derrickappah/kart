import { createClient, createServiceRoleClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import AccountDeletionsClient from './AccountDeletionsClient';

export const dynamic = 'force-dynamic';

export default async function AdminAccountDeletionsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Verify admin access
    const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

    if (!profile || !profile.is_admin) {
        redirect('/dashboard');
    }

    const adminSupabase = createServiceRoleClient();

    let requests = [];
    let pageNotice = null;

    try {
        const { data: rawRequests, error } = await adminSupabase
            .from('account_deletion_requests')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching deletion requests:', error);
            pageNotice = error.message;
        } else {
            requests = rawRequests || [];
        }

        if (requests.length > 0) {
            const userIds = [...new Set(requests.map(r => r.user_id).filter(Boolean))];
            if (userIds.length > 0) {
                const { data: profiles } = await adminSupabase
                    .from('profiles')
                    .select('id, email, display_name, avatar_url, campus, phone, is_admin, banned')
                    .in('id', userIds);

                const profilesMap = new Map((profiles || []).map(p => [p.id, p]));

                requests = requests.map(r => ({
                    ...r,
                    user: profilesMap.get(r.user_id) || null
                }));
            }
        }
    } catch (e) {
        console.error('AccountDeletionsPage error:', e);
        pageNotice = e.message || 'Failed to load deletion requests';
    }

    const stats = {
        total: requests.length,
        pending: requests.filter(r => r.status === 'pending').length,
        approved: requests.filter(r => r.status === 'approved').length,
        rejected: requests.filter(r => r.status === 'rejected').length,
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-black tracking-tighter">Account Deletions</h1>
                <p className="text-xs font-bold text-[#4b636c] dark:text-gray-400 uppercase tracking-widest">
                    Review and process user account deletion requests
                </p>
            </div>

            {pageNotice && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-2xl text-xs font-bold flex items-center gap-3">
                    <span>Notice: {pageNotice}</span>
                </div>
            )}

            <AccountDeletionsClient initialRequests={requests} stats={stats} />
        </div>
    );
}
