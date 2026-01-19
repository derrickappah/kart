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
    .select('*, reporter:profiles!reports_reporter_id_fkey(id, display_name, email), product:products(id, title)')
    .order('created_at', { ascending: false });

  // Apply status filter
  if (statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }

  const { data: reports, error } = await query;

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
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Product Reports</h1>
          <p className={styles.subtitle}>Review and manage all product reports</p>
        </div>
        <Link href="/dashboard/admin" className={styles.backButton}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to Dashboard
        </Link>
      </header>

      {/* Stats Row */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total Reports</div>
          <div className={styles.statValue}>{totalCount || 0}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Pending</div>
          <div className={styles.statValue}>{pendingCount || 0}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Resolved</div>
          <div className={styles.statValue}>{resolvedCount || 0}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Dismissed</div>
          <div className={styles.statValue}>{dismissedCount || 0}</div>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filterSection}>
        <div className={styles.filterTabs}>
          <Link
            href="/dashboard/admin/reports"
            className={`${styles.filterTab} ${statusFilter === 'all' ? styles.filterTabActive : ''}`}
          >
            All Reports
            {totalCount > 0 && <span className={styles.filterTabCount}>{totalCount}</span>}
          </Link>
          <Link
            href="/dashboard/admin/reports?status=Pending"
            className={`${styles.filterTab} ${statusFilter === 'Pending' ? styles.filterTabActive : ''}`}
          >
            Pending
            {pendingCount > 0 && <span className={styles.filterTabCount}>{pendingCount}</span>}
          </Link>
          <Link
            href="/dashboard/admin/reports?status=Resolved"
            className={`${styles.filterTab} ${statusFilter === 'Resolved' ? styles.filterTabActive : ''}`}
          >
            Resolved
            {resolvedCount > 0 && <span className={styles.filterTabCount}>{resolvedCount}</span>}
          </Link>
          <Link
            href="/dashboard/admin/reports?status=Dismissed"
            className={`${styles.filterTab} ${statusFilter === 'Dismissed' ? styles.filterTabActive : ''}`}
          >
            Dismissed
            {dismissedCount > 0 && <span className={styles.filterTabCount}>{dismissedCount}</span>}
          </Link>
        </div>
      </div>

      {error && (
        <div className={styles.errorMessage}>
          <svg className={styles.errorIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 9V12M12 15H12.01M5 19H19C19.5523 19 20 18.5523 20 18V6C20 5.44772 19.5523 5 19 5H5C4.44772 5 4 5.44772 4 6V18C4 18.5523 4.44772 19 5 19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Error loading reports: {error.message}
        </div>
      )}

      {!reports || reports.length === 0 ? (
        <div className={styles.emptyState}>
          <svg className={styles.emptyStateIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <div className={styles.emptyStateTitle}>No Reports</div>
          <div className={styles.emptyStateText}>All clear! No pending reports.</div>
        </div>
      ) : (
        <div className={styles.reportsList}>
          {reports.map((report) => (
            <div key={report.id} className={styles.reportCard}>
              <div className={styles.cardContent}>
                <div className={styles.reportInfo}>
                  <div className={styles.reportHeader}>
                    <h3 className={styles.productTitle}>
                      {report.product?.title || 'Product'}
                    </h3>
                    <span className={`${styles.statusBadge} ${getStatusClass(report.status)}`}>
                      {report.status === 'Pending' && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M6 1V6L9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                      {report.status === 'Resolved' && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                      {report.status === 'Dismissed' && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M9 3L3 9M3 3L9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                      {report.status}
                    </span>
                  </div>
                  <div className={styles.reportDetails}>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Reporter</span>
                      <span className={styles.detailValue}>{report.reporter?.display_name || 'No name'}</span>
                      <span className={styles.detailValueSecondary}>{report.reporter?.email || 'Unknown'}</span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Reported</span>
                      <span className={styles.detailValue}>
                        {new Date(report.created_at).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                  <div className={styles.reasonBadge}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M6 1V6L9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Reason: {report.reason}
                  </div>
                  {report.description && (
                    <div className={styles.descriptionBox}>
                      <p className={styles.descriptionText}>
                        {report.description}
                      </p>
                    </div>
                  )}
                  <div className={styles.reportMeta}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M8 2V6M16 2V6M3 10H21M5 4H19C20.1046 4 21 4.89543 21 6V20C21 21.1046 20.1046 22 19 22H5C3.89543 22 3 21.1046 3 20V6C3 4.89543 3.89543 4 5 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Reported on {new Date(report.created_at).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </div>
                </div>
                <div className={styles.actionButtons}>
                  <Link 
                    href={`/marketplace/${report.product?.id}`} 
                    target="_blank"
                    className={styles.viewProductButton}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M18 13V19A2 2 0 0 1 16 21H5A2 2 0 0 1 3 19V8A2 2 0 0 1 5 6H11M15 3H21M21 3V9M21 3L9 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    View Product
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
