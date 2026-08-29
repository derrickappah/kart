import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/utils/supabase/server';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
};

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: corsHeaders,
    });
}

export async function POST(request) {
    try {
        let user = null;
        const serviceClient = createServiceRoleClient();

        // 1. Check for Bearer token in Authorization header (essential for Mobile Safari, Android WebView, Capacitor)
        const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
        if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
            const token = authHeader.substring(7).trim();
            if (token) {
                const { data: userData, error: tokenError } = await serviceClient.auth.getUser(token);
                if (!tokenError && userData?.user) {
                    user = userData.user;
                }
            }
        }

        // 2. If no Bearer token, check session cookies
        if (!user) {
            try {
                const cookieSupabase = await createClient();
                const { data: { user: cookieUser } } = await cookieSupabase.auth.getUser();
                if (cookieUser) {
                    user = cookieUser;
                }
            } catch (cookieErr) {
                console.warn('[Upload API] Cookie auth check failed:', cookieErr?.message);
            }
        }

        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized: Please log in to upload files' },
                { status: 401, headers: corsHeaders }
            );
        }

        let buffer = null;
        let bucket = 'products';
        let customPath = null;
        let contentType = 'image/jpeg';
        let ext = 'jpg';

        const contentTypeHeader = request.headers.get('content-type') || '';

        if (contentTypeHeader.includes('application/json')) {
            // Handle JSON Base64 Payload (fastest, most reliable on mobile)
            const body = await request.json();
            const { imageBase64, bucket: reqBucket, filePath } = body;

            if (!imageBase64 || typeof imageBase64 !== 'string') {
                return NextResponse.json({ error: 'No image data provided' }, { status: 400, headers: corsHeaders });
            }

            if (reqBucket) bucket = reqBucket;
            if (filePath) customPath = filePath;

            let rawBase64 = imageBase64;
            if (imageBase64.includes(',')) {
                const parts = imageBase64.split(',');
                const mimeMatch = parts[0].match(/:(.*?);/);
                if (mimeMatch) contentType = mimeMatch[1];
                rawBase64 = parts[1];
            }

            buffer = Buffer.from(rawBase64, 'base64');
        } else {
            // Handle Multipart Form Data
            const formData = await request.formData();
            const file = formData.get('file');
            const reqBucket = formData.get('bucket');
            const reqPath = formData.get('filePath');

            if (!file) {
                return NextResponse.json({ error: 'No file provided' }, { status: 400, headers: corsHeaders });
            }

            if (reqBucket) bucket = reqBucket;
            if (reqPath) customPath = reqPath;

            contentType = file.type || 'image/jpeg';
            const bytes = await file.arrayBuffer();
            buffer = Buffer.from(bytes);
        }

        const allowedBuckets = ['products', 'profiles', 'chat-attachments', 'verifications'];
        if (!allowedBuckets.includes(bucket)) {
            return NextResponse.json({ error: 'Invalid storage bucket' }, { status: 400, headers: corsHeaders });
        }

        if (contentType.includes('webp')) ext = 'webp';
        else if (contentType.includes('png')) ext = 'png';
        else if (contentType.includes('gif')) ext = 'gif';

        const fileName = customPath || `${user.id}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;
        const filePath = fileName;

        // Use service role client to upload directly to Supabase storage
        const { error: uploadError } = await serviceClient.storage
            .from(bucket)
            .upload(filePath, buffer, {
                contentType,
                upsert: true,
                cacheControl: '31536000'
            });

        if (uploadError) {
            console.error('[Upload API] Storage upload error:', uploadError);
            return NextResponse.json(
                { error: uploadError.message || 'Storage upload failed' },
                { status: 500, headers: corsHeaders }
            );
        }

        const { data: { publicUrl } } = serviceClient.storage
            .from(bucket)
            .getPublicUrl(filePath);

        return NextResponse.json({
            success: true,
            publicUrl,
            filePath
        }, { headers: corsHeaders });
    } catch (error) {
        console.error('[Upload API] Unexpected error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error during upload' },
            { status: 500, headers: corsHeaders }
        );
    }
}
