import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

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

    const [productsResult, reportersResult] = await Promise.all([
      productIds.length > 0 ? supabase.from('products').select('id, title').in('id', productIds) : { data: [] },
      reporterIds.length > 0 ? supabase.from('profiles').select('id, email, display_name').in('id', reporterIds) : { data: [] }
    ]);

    const products = productsResult.data || [];
    const reporters = reportersResult.data || [];

    const productMap = new Map(products.map(p => [p.id, p]));
    const reporterMap = new Map(reporters.map(p => [p.id, p]));

    reports = reports.map(r => ({
      ...r,
      product: productMap.get(r.product_id) || null,
      reporter: reporterMap.get(r.reporter_id) || null
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

  const getStatusClass = (status) => {
    switch (status) {
      case 'Pending': return styles.statusPending;
      case 'Resolved': return styles.statusResolved;
      case 'Dismissed': return styles.statusDismissed;
      default: return styles.statusPending;
    }
  };

  return (
    <div className="space-y-8 pb-12">

      {/* Compliance Stats Pulse */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Inquiries', value: totalCount, color: 'primary', icon: 'visibility', sub: 'Cumulative reports' },
          { label: 'Unresolved', value: pendingCount, color: 'amber-500', icon: 'pending', sub: 'Requires attention' },
          { label: 'Resolved', value: resolvedCount, color: 'green-500', icon: 'check_circle', sub: 'Successfully settled' },
          { label: 'Dismissed', value: dismissedCount, color: 'gray-500', icon: 'block', sub: 'Non-violating items' }
        ].map((stat, i) => (
          <div key={i} className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md p-6 rounded-2xl border border-[#dce3e5] dark:border-[#2d3b41] shadow-sm transform hover:-translate-y-1 transition-all">
            <div className="flex items-center gap-4 mb-4">
              <div className={`size-12 rounded-xl flex items-center justify-center ${stat.color === 'primary' ? 'bg-primary/10 text-primary' :
                stat.color === 'amber-500' ? 'bg-amber-500/10 text-amber-500' :
                  stat.color === 'green-500' ? 'bg-green-500/10 text-green-500' :
                    'bg-gray-500/10 text-gray-500'
                }`}>
                <span className="material-symbols-outlined text-[24px] font-bold">{stat.icon}</span>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#4b636c]">{stat.label}</p>
                <p className="text-xl font-black tracking-tighter">{stat.value}</p>
              </div>
            </div>
            <p className="text-[10px] text-[#4b636c] font-black uppercase tracking-widest">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Enforcement Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md p-2 rounded-2xl border border-[#dce3e5] dark:border-[#2d3b41]">
        {[
          { id: 'all', label: 'All Activity' },
          { id: 'Pending', label: 'Unresolved' },
          { id: 'Resolved', label: 'Resolved' },
          { id: 'Dismissed', label: 'Dismissed' }
        ].map(filter => (
          <Link
            key={filter.id}
            href={filter.id === 'all' ? '/dashboard/admin/reports' : `/dashboard/admin/reports?status=${filter.id}`}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${statusFilter === filter.id
              ? 'bg-primary text-white shadow-lg shadow-primary/20'
              : 'text-[#4b636c] hover:bg-gray-100 dark:hover:bg-[#212b30]'
              }`}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-500 bg-red-500/10 p-4 rounded-xl border border-red-500/20">
          <span className="material-symbols-outlined text-[20px]">error</span>
          <p className="text-sm font-medium">Error loading compliance data: {error.message}</p>
        </div>
      )}

      {reports && reports.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map((report) => (
            <div key={report.id} className="bg-white/70 dark:bg-[#182125]/70 backdrop-blur-md rounded-2xl border border-[#dce3e5] dark:border-[#2d3b41] overflow-hidden flex flex-col group hover:border-primary/30 transition-all shadow-sm">
              <div className="p-6 pb-2 border-b border-[#dce3e5] dark:border-[#2d3b41] flex items-center justify-between bg-background-light dark:bg-[#212b30]/30">
                <div className="flex items-center gap-2">
                  {report.status === 'Pending' ? (
                    <span className="size-2 bg-amber-500 rounded-full animate-pulse"></span>
                  ) : report.status === 'Resolved' ? (
                    <span className="material-symbols-outlined text-green-500 text-[14px]">verified</span>
                  ) : (
                    <span className="material-symbols-outlined text-gray-400 text-[14px]">block</span>
                  )}
                  <span className={`text-[10px] font-black uppercase tracking-widest ${report.status === 'Pending' ? 'text-amber-500' :
                    report.status === 'Resolved' ? 'text-green-500' : 'text-[#4b636c]'
                    }`}>
                    {report.status}
                  </span>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#4b636c]">
                  {new Date(report.created_at).toLocaleDateString()}
                </span>
              </div>

              <div className="p-6 flex-1 space-y-4">
                <div>
                  <h4 className="text-[9px] font-black uppercase mr-2 tracking-[0.2em] text-[#4b636c] mb-1">Reported Item</h4>
                  <p className="text-sm font-black tracking-tighter uppercase line-clamp-1">{report.product?.title || 'Unknown Product'}</p>
                </div>

                <div className="bg-white dark:bg-[#212b30] p-4 rounded-xl border border-[#dce3e5] dark:border-[#2d3b41] text-[10px] font-black uppercase tracking-[0.05em] text-red-500 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">report</span>
                  Reason: {report.reason}
                </div>

                {report.description && (
                  <div className="bg-white/50 dark:bg-[#111618]/50 p-4 rounded-xl italic text-xs font-black text-[#4b636c] leading-relaxed">
                    {report.description}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 pt-2">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase text-[#4b636c] tracking-widest">Submitted By</p>
                    <div className="flex items-center gap-2">
                      <div className="size-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[8px] font-black">
                        {report.reporter?.display_name?.charAt(0) || 'R'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-tighter truncate">{report.reporter?.display_name || 'Anonymous User'}</p>
                        <p className="text-[10px] text-[#4b636c] font-black uppercase tracking-tighter truncate">{report.reporter?.email}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 bg-background-light dark:bg-[#212b30]/30 mt-auto flex items-center justify-between border-t border-[#dce3e5] dark:border-[#2d3b41]">
                <Link
                  href={`/marketplace/${report.product?.id}`}
                  target="_blank"
                  className="flex items-center gap-2 text-primary text-[10px] font-black uppercase tracking-widest hover:bg-primary/10 px-3 py-2 rounded-lg transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                  Investigate
                </Link>
                <div className="flex items-center gap-2">
                  <button className="size-8 rounded-lg hover:bg-green-500/10 text-green-600 transition-colors flex items-center justify-center" title="Resolve">
                    <span className="material-symbols-outlined text-[20px]">check</span>
                  </button>
                  <button className="size-8 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors flex items-center justify-center" title="Dismiss">
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-20 flex flex-col items-center justify-center text-center">
          <div className="size-20 bg-gray-100 dark:bg-[#182125] rounded-3xl flex items-center justify-center mb-6 border border-[#dce3e5] dark:border-[#2d3b41]">
            <span className="material-symbols-outlined text-4xl text-[#4b636c]/30">shield_check</span>
          </div>
          <h3 className="text-xl font-black tracking-tighter uppercase">Sector Clear</h3>
          <p className="text-[#4b636c] text-[10px] font-black uppercase tracking-widest mt-2 max-w-xs">No pending compliance reports are currently awaiting your review.</p>
        </div>
      )}
    </div>
  );
}
