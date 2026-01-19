'use client';
import { useState } from 'react';
import { createClient } from '../../../../utils/supabase/client';
import { useRouter } from 'next/navigation';

export default function UserManagementClient({ initialUsers, stats = {} }) {
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const handleSearch = (e) => {
        e.preventDefault();
        router.push(`/dashboard/admin/users?q=${search}`);
    };

    const toggleBan = async (userId, currentStatus) => {
        if (!confirm(`Are you sure you want to ${currentStatus ? 'unban' : 'ban'} this user?`)) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ banned: !currentStatus })
                .eq('id', userId);

            if (error) throw error;

            router.refresh();
        } catch (err) {
            alert('Error updating user: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            {/* Stats Row */}
            {stats && Object.keys(stats).length > 0 && (
                <div className={styles.statsRow}>
                    <div className={styles.statCard}>
                        <div className={styles.statLabel}>Total Users</div>
                        <div className={styles.statValue}>{stats.total || 0}</div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statLabel}>Active Users</div>
                        <div className={styles.statValue}>{stats.active || 0}</div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statLabel}>Admins</div>
                        <div className={styles.statValue}>{stats.admins || 0}</div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statLabel}>Banned</div>
                        <div className={styles.statValue}>{stats.banned || 0}</div>
                    </div>
                </div>
            )}

            {/* Search Bar */}
            <div className={styles.searchSection}>
                <form onSubmit={handleSearch} className={styles.searchForm}>
                    <input
                        type="text"
                        placeholder="Search by email or name..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className={styles.searchInput}
                    />
                    <button type="submit" className={styles.searchButton}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Search
                    </button>
                </form>
            </div>

            {/* Users Table */}
            {initialUsers.length === 0 ? (
                <div className={styles.emptyState}>
                    <svg className={styles.emptyStateIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M9 11C11.2091 11 13 9.20914 13 7C13 4.79086 11.2091 3 9 3C6.79086 3 5 4.79086 5 7C5 9.20914 6.79086 11 9 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <div className={styles.emptyStateTitle}>No users found</div>
                    <div className={styles.emptyStateText}>Try adjusting your search query</div>
                </div>
            ) : (
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead className={styles.tableHeader}>
                            <tr>
                                <th>User</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody className={styles.tableBody}>
                            {initialUsers.map(user => (
                                <tr key={user.id}>
                                    <td>
                                        <div className={styles.userCell}>
                                            <div className={styles.userAvatar}>
                                                {user.display_name?.[0]?.toUpperCase() || 'U'}
                                            </div>
                                            <span className={styles.userName}>{user.display_name || 'N/A'}</span>
                                        </div>
                                    </td>
                                    <td>{user.email}</td>
                                    <td>
                                        <span className={`${styles.roleBadge} ${user.is_admin ? styles.roleAdmin : styles.roleUser}`}>
                                            {user.is_admin ? (
                                                <>
                                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M6 0L7.5 4.5L12 6L7.5 7.5L6 12L4.5 7.5L0 6L4.5 4.5L6 0Z" fill="currentColor"/>
                                                    </svg>
                                                    Admin
                                                </>
                                            ) : (
                                                'User'
                                            )}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`${styles.statusBadge} ${user.banned ? styles.statusBanned : styles.statusActive}`}>
                                            {user.banned ? (
                                                <>
                                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M9 3L3 9M3 3L9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                    </svg>
                                                    Banned
                                                </>
                                            ) : (
                                                <>
                                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                    </svg>
                                                    Active
                                                </>
                                            )}
                                        </span>
                                    </td>
                                    <td>
                                        <button
                                            onClick={() => toggleBan(user.id, user.banned)}
                                            className={`${styles.actionButton} ${user.banned ? styles.unbanButton : styles.banButton}`}
                                            disabled={loading || user.is_admin}
                                        >
                                            {user.banned ? 'Unban' : 'Ban'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
