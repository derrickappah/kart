import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getWebhookLogs, logWebhook } from '@/lib/webhookLogger';

// Re-export the logger for any legacy imports (safeguard)
export { logWebhook };

export async function GET(request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const logs = getWebhookLogs();

        return NextResponse.json({
            logs,
            count: logs.length,
            webhook_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://kart-murex.vercel.app'}/api/paystack/webhook`,
            instructions: [
                "1. Check if Paystack is sending webhooks to the URL above",
                "2. Go to Paystack Dashboard > Settings > API Keys & Webhooks",
                "3. Verify the webhook URL matches exactly",
                "4. Check the 'Webhook Logs' tab in Paystack to see delivery attempts",
                "5. If logs are empty here but Paystack shows attempts, check signature verification"
            ]
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
