import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/utils/supabase/server';
import { createNotification } from '@/lib/notifications';

export async function POST(request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { followingId } = body;

        if (!followingId) {
            return NextResponse.json({ error: 'followingId is required' }, { status: 400 });
        }

        if (user.id === followingId) {
            return NextResponse.json({ error: 'You cannot follow yourself' }, { status: 400 });
        }

        // Check if follow record already exists
        const { data: existingFollow, error: checkError } = await supabase
            .from('follows')
            .select('id')
            .eq('follower_id', user.id)
            .eq('following_id', followingId)
            .maybeSingle();

        if (checkError) {
            console.error('Error checking follow status:', checkError);
            return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
        }

        if (existingFollow) {
            // Unfollow
            const { error: deleteError } = await supabase
                .from('follows')
                .delete()
                .eq('follower_id', user.id)
                .eq('following_id', followingId);

            if (deleteError) {
                console.error('Error unfollowing:', deleteError);
                return NextResponse.json({ error: 'Failed to unfollow' }, { status: 500 });
            }

            // Get updated follower count
            const { count: followerCount } = await supabase
                .from('follows')
                .select('*', { count: 'exact', head: true })
                .eq('following_id', followingId);

            return NextResponse.json({
                success: true,
                isFollowing: false,
                followerCount: followerCount || 0,
                message: 'Unfollowed successfully'
            });
        } else {
            // Follow
            const { error: insertError } = await supabase
                .from('follows')
                .insert({
                    follower_id: user.id,
                    following_id: followingId
                });

            if (insertError) {
                console.error('Error following user:', insertError);
                return NextResponse.json({ error: 'Failed to follow user' }, { status: 500 });
            }

            // Send notification to the followed user & trigger push
            try {
                const adminSupabase = createServiceRoleClient();
                const { data: followerProfile } = await adminSupabase
                    .from('profiles')
                    .select('display_name, username, avatar_url')
                    .eq('id', user.id)
                    .maybeSingle();

                const followerName = followerProfile?.username || followerProfile?.display_name || 'Someone';

                await createNotification(adminSupabase, {
                    userId: followingId,
                    type: 'follow',
                    title: 'New Follower',
                    message: `${followerName} started following you.`,
                    options: {
                        icon: followerProfile?.avatar_url || '/icon.png',
                        avatarUrl: followerProfile?.avatar_url,
                        url: `/profile/${user.id}`
                    }
                });
            } catch (notifyErr) {
                console.error('Failed to create follow notification:', notifyErr);
            }

            // Get updated follower count
            const { count: followerCount } = await supabase
                .from('follows')
                .select('*', { count: 'exact', head: true })
                .eq('following_id', followingId);

            return NextResponse.json({
                success: true,
                isFollowing: true,
                followerCount: followerCount || 0,
                message: 'Followed successfully'
            });
        }
    } catch (error) {
        console.error('Follow toggle route error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}