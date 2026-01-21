import { createClient } from '../../../../utils/supabase/server';
import { redirect } from 'next/navigation';
import UserManagementClient from './UserManagementClient';

export default async function AdminUsersPage({ searchParams }) {
    // Await params for Next.js 15+ compatibility
    const { q } = await searchParams;
    const supabase = await createClient();

    // Auth check (admin check is handled by layout)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    // Fetch Users
    let query = supabase.from('profiles').select('*').order('created_at', { ascending: false });

    if (q) {
        // Simple search by email or name (Supabase implementation depends on text search config, 
        // simplified here using email ilike for MVP)
        query = query.ilike('email', `%${q}%`);
    }

    const { data: users, error } = await query;

    // Calculate stats
    const totalUsers = users?.length || 0;
    const adminCount = users?.filter(u => u.is_admin).length || 0;
    const bannedCount = users?.filter(u => u.banned).length || 0;
    const activeCount = totalUsers - bannedCount;

    return (
        <div className="space-y-8">

            <UserManagementClient
                initialUsers={users || []}
                stats={{
                    total: totalUsers,
                    admins: adminCount,
                    active: activeCount,
                    banned: bannedCount
                }}
            />
        </div>
    );
}

