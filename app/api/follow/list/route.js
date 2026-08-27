import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/utils/supabase/server';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const type = searchParams.get('type') || 'followers'; // 'followers' or 'following'
        const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);

        if (!userId) {
            return NextResponse.json({ error: 'userId is required' }, { status: 400 });
        }

        const supabase = createServiceRoleClient();

        if (type === 'followers') {
            // Find users who follow userId (follower_id)
            const { data: followRecords, error: followError } = await supabase
                .from('follows')
                .select('follower_id, created_at')
                .eq('following_id', userId)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (followError) {
                console.error('Error fetching followers:', followError);
                return NextResponse.json({ error: 'Failed to fetch followers' }, { status: 500 });
            }

            if (!followRecords || followRecords.length === 0) {
                return NextResponse.json({ data: [] });
            }

            const followerIds = followRecords.map(f => f.follower_id);
            const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('id, display_name, username, avatar_url, is_verified, campus')
                .in('id', followerIds);

            if (profilesError) {
                console.error('Error fetching follower profiles:', profilesError);
                return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 });
            }

            // Map in correct order
            const profilesMap = new Map((profiles || []).map(p => [p.id, p]));
            const result = followRecords
                .map(f => profilesMap.get(f.follower_id))
                .filter(Boolean);

            return NextResponse.json({ data: result });
        } else {
            // Find users that userId follows (following_id)
            const { data: followRecords, error: followError } = await supabase
                .from('follows')
                .select('following_id, created_at')
                .eq('follower_id', userId)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (followError) {
                console.error('Error fetching following:', followError);
                return NextResponse.json({ error: 'Failed to fetch following' }, { status: 500 });
            }

            if (!followRecords || followRecords.length === 0) {
                return NextResponse.json({ data: [] });
            }

            const followingIds = followRecords.map(f => f.following_id);
            const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('id, display_name, username, avatar_url, is_verified, campus')
                .in('id', followingIds);

            if (profilesError) {
                console.error('Error fetching following profiles:', profilesError);
                return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 });
            }

            const profilesMap = new Map((profiles || []).map(p => [p.id, p]));
            const result = followRecords
                .map(f => profilesMap.get(f.following_id))
                .filter(Boolean);

            return NextResponse.json({ data: result });
        }
    } catch (error) {
        console.error('Follow list route error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}