/**
 * Webhook Logger Utility
 * Maintains a thread-safe, in-memory rolling list of webhook activity
 */

let webhookLogs = [];
const MAX_LOGS = 50;

export function logWebhook(data) {
    webhookLogs.unshift({
        timestamp: new Date().toISOString(),
        ...data
    });
    if (webhookLogs.length > MAX_LOGS) {
        webhookLogs = webhookLogs.slice(0, MAX_LOGS);
    }
}

export function getWebhookLogs() {
    return webhookLogs;
}
