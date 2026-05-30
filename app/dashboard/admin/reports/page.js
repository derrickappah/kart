import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import ReportsClient from './ReportsClient';

export default async function AdminReportsPage({ searchParams }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Admin check is handled by layout
  // Get filter from search params
  const resolvedSearchParams = await searchParams;
  const statusFilter = resolvedSearchParams?.status || 'all';

  // Fetch reports
  let query = supabase
    .from('reports')
    .select('*')
    .order('created_at', { ascending: false });

  // Apply status filter
  if (statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }

  const { data: rawReports, error } = await query;
  let reports = rawReports || [];

  // Manually fetch related data
  if (reports.length > 0) {
    const productIds = [...new Set(reports.map(r => r.product_id).filter(Boolean))];
    const reporterIds = [...new Set(reports.map(r => r.reporter_id).filter(Boolean))];
    const reportedUserIds = [...new Set(reports.map(r => r.reported_user_id).filter(Boolean))];

    const [productsResult, reportersResult, reportedUsersResult] = await Promise.all([
      productIds.length > 0 ? supabase.from('products').select('id, title').in('id', productIds) : { data: [] },
      reporterIds.length > 0 ? supabase.from('profiles').select('id, email, display_name').in('id', reporterIds) : { data: [] },
      reportedUserIds.length > 0 ? supabase.from('profiles').select('id, email, display_name').in('id', reportedUserIds) : { data: [] }
    ]);

    const products = productsResult.data || [];
    const reporters = reportersResult.data || [];
    const reportedUsers = reportedUsersResult.data || [];

    const productMap = new Map(products.map(p => [p.id, p]));
    const reporterMap = new Map(reporters.map(p => [p.id, p]));
    const reportedUserMap = new Map(reportedUsers.map(p => [p.id, p]));

    reports = reports.map(r => ({
      ...r,
      product: productMap.get(r.product_id) || null,
      reporter: reporterMap.get(r.reporter_id) || null,
      reportedUser: reportedUserMap.get(r.reported_user_id) || null
    }));
  }

  // Fetch all reports for stats (unfiltered)
  const { data: allReports } = await supabase
    .from('reports')
    .select('status');

  // Calculate stats from all reports
  const totalCount = allReports?.length || 0;
  const pendingCount = allReports?.filter(r => r.status === 'Pending').length || 0;
  const resolvedCount = allReports?.filter(r => r.status === 'Resolved').length || 0;
  const dismissedCount = allReports?.filter(r => r.status === 'Dismissed').length || 0;

  const stats = {
    total: totalCount,
    pending: pendingCount,
    resolved: resolvedCount,
    dismissed: dismissedCount
  };

  return (
    <div className="space-y-8">
      {error && (
        <div className="flex items-center gap-2 text-red-500 bg-red-500/10 p-4 rounded-xl border border-red-500/20">
          <span className="material-symbols-outlined text-[20px]">error</span>
          <p className="text-sm font-medium">Error loading compliance data: {error.message}</p>
        </div>
      )}

      <ReportsClient
        initialReports={reports}
        stats={stats}
      />
    </div>
  );
}

