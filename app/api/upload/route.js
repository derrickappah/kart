import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/utils/supabase/server';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

export async function POST(request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized: Please log in to upload files' }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('file');
        const bucket = formData.get('bucket') || 'products';
        let customPath = formData.get('filePath');

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // Validate allowed buckets
        const allowedBuckets = ['products', 'profiles', 'chat-attachments', 'verifications'];
        if (!allowedBuckets.includes(bucket)) {
            return NextResponse.json({ error: 'Invalid storage bucket' }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Derive content type and filename extension
        const contentType = file.type || 'image/jpeg';
        let ext = 'jpg';
        if (contentType.includes('webp')) ext = 'webp';
        else if (contentType.includes('png')) ext = 'png';
        else if (contentType.includes('gif')) ext = 'gif';

        const fileName = customPath || `${user.id}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;
        const filePath = fileName;

        // Use service role client for guaranteed upload reliability without client-side RLS quirks
        const serviceClient = createServiceRoleClient();
        const { error: uploadError } = await serviceClient.storage
            .from(bucket)
            .upload(filePath, buffer, {
                contentType,
                upsert: true
            });

        if (uploadError) {
            console.error('[Upload API] Storage upload error:', uploadError);
            return NextResponse.json({ error: uploadError.message || 'Storage upload failed' }, { status: 500 });
        }

        const { data: { publicUrl } } = serviceClient.storage
            .from(bucket)
            .getPublicUrl(filePath);

        return NextResponse.json({
            success: true,
            publicUrl,
            filePath
        });
    } catch (error) {
        console.error('[Upload API] Unexpected error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error during upload' }, { status: 500 });
    }
}
