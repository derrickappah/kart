import { createClient } from '../../../../utils/supabase/server';
import { redirect } from 'next/navigation';
import VerificationsClient from './VerificationsClient';

export default async function AdminVerificationsPage({ searchParams }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Verify if user is actually an admin server-side
    const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

    if (!profile || !profile.is_admin) {
        redirect('/dashboard');
    }

    // Get filter from search params
    const resolvedSearchParams = await searchParams;
    const statusFilter = resolvedSearchParams?.status || 'all';

    // 1. Build query for filtered verifications
    let query = supabase
        .from('verification_requests')
        .select('*')
        .order('created_at', { ascending: false });

    // Apply status filter
    if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
    }

    const { data: verifications, error } = await query;

    // Manual mapping for profiles and generating batch signed URLs for private files
    let verificationsWithUsers = [];
    if (verifications && verifications.length > 0) {
        const userIds = [...new Set(verifications.map(v => v.user_id))];
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, email, display_name, is_verified')
            .in('id', userIds);

        // Collect relative paths to sign (those that do not start with http/https)
        const relativePaths = verifications
            .map(v => v.student_id_image)
            .filter(path => path && !path.startsWith('http'));

        let signedUrlMap = {};
        if (relativePaths.length > 0) {
            const { data: signedUrls, error: signError } = await supabase.storage
                .from('verifications')
                .createSignedUrls(relativePaths, 3600); // 1 hour expiry

            if (!signError && signedUrls) {
                // Map the relative path back to its signed URL
                relativePaths.forEach((path, idx) => {
                    if (signedUrls[idx]?.signedUrl) {
                        signedUrlMap[path] = signedUrls[idx].signedUrl;
                    }
                });
            }
        }

        verificationsWithUsers = verifications.map(verification => {
            const imagePath = verification.student_id_image;
            const studentIdImage = (imagePath && !imagePath.startsWith('http'))
                ? (signedUrlMap[imagePath] || '')
                : imagePath;

            return {
                ...verification,
                student_id_image: studentIdImage,
                user: profiles?.find(p => p.id === verification.user_id) || null
            };
        });
    }

    // 2. Fetch Global Stats (Independent of filters)
    const { data: allStats } = await supabase
        .from('verification_requests')
        .select('status');

    const stats = {
        total: allStats?.length || 0,
        pending: allStats?.filter(v => v.status === 'Pending').length || 0,
        approved: allStats?.filter(v => v.status === 'Approved').length || 0,
        rejected: allStats?.filter(v => v.status === 'Rejected').length || 0
    };

    return (
        <div className="space-y-8">
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-500 text-sm font-medium">
                    Error loading verification requests: {error.message}
                </div>
            )}

            <VerificationsClient
                initialVerifications={verificationsWithUsers || []}
                stats={stats}
            />
        </div>
    );
}

