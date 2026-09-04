import { createClient, createServiceRoleClient } from '../../../../utils/supabase/server';
import { redirect } from 'next/navigation';
import UserManagementClient from './UserManagementClient';

export default async function AdminUsersPage({ searchParams }) {
    const sParams = await searchParams;
    const q = sParams?.q ? sParams.q.trim() : '';
    const campus = sParams?.campus || '';
    const status = sParams?.status || '';
    const role = sParams?.role || '';
    const verified = sParams?.verified || '';
    const sort = sParams?.sort || 'newest';
    const page = Math.max(1, parseInt(sParams?.page || '1', 10));
    const pageSize = 20;

    const supabase = await createClient();

    // Auth verification
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const adminSupabase = createServiceRoleClient();

    // Fetch system-wide user counts for KPI widgets and campuses list in parallel
    const [allProfilesResult, campusesResult] = await Promise.all([
        adminSupabase.from('profiles').select('id, is_admin, banned, is_verified'),
        adminSupabase.from('campuses').select('name, abbreviation').order('name', { ascending: true })
    ]);

    const allProfiles = allProfilesResult.data || [];
    const campusesList = campusesResult.data || [];

    const stats = {
        total: allProfiles.length,
        active: allProfiles.filter((u) => !u.banned).length,
        admins: allProfiles.filter((u) => u.is_admin).length,
        banned: allProfiles.filter((u) => u.banned).length,
        verified: allProfiles.filter((u) => u.is_verified).length
    };

    // Filtered users query with exact total count
    let query = adminSupabase
        .from('profiles')
        .select('*', { count: 'exact' });

    if (q) {
        query = query.or(`email.ilike.%${q}%,display_name.ilike.%${q}%,phone.ilike.%${q}%`);
    }

    if (campus) {
        query = query.eq('campus', campus);
    }

    if (status === 'Active') {
        query = query.eq('banned', false);
    } else if (status === 'Banned') {
        query = query.eq('banned', true);
    }

    if (role === 'admin') {
        query = query.eq('is_admin', true);
    } else if (role === 'user') {
        query = query.eq('is_admin', false);
    }

    if (verified === 'true') {
        query = query.eq('is_verified', true);
    } else if (verified === 'false') {
        query = query.eq('is_verified', false);
    }

    // Apply sorting
    if (sort === 'oldest') {
        query = query.order('created_at', { ascending: true });
    } else if (sort === 'name_asc') {
        query = query.order('display_name', { ascending: true, nullsFirst: false });
    } else if (sort === 'name_desc') {
        query = query.order('display_name', { ascending: false, nullsFirst: false });
    } else {
        // default newest
        query = query.order('created_at', { ascending: false });
    }

    // Apply pagination range
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data: users, count: totalFiltered, error } = await query;

    if (error) {
        console.error('Error fetching admin users:', error);
    }

    return (
        <div className="space-y-6">
            <UserManagementClient
                initialUsers={users || []}
                stats={stats}
                totalFiltered={totalFiltered ?? (users?.length || 0)}
                currentPage={page}
                pageSize={pageSize}
                campuses={campusesList}
                currentFilters={{
                    q,
                    campus,
                    status,
                    role,
                    verified,
                    sort
                }}
            />
        </div>
    );
}


