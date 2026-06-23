export interface NotificationHttpClientConfig {
    baseUrl: string;
    timeoutMs?: number;
}

export interface SendConfirmationEmailInput {
    to: string;
    repo: string;
    confirmToken: string;
    unsubscribeToken: string;
}

export interface SendNewReleaseEmailInput {
    to: string;
    repo: string;
    releaseName: string | null;
    tagName: string;
    releaseUrl: string;
    unsubscribeToken: string;
}

export interface EmailHttpResponse {
    success: boolean;
}

async function postJson<T>(url: string, body: unknown, timeoutMs: number): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            signal: controller.signal,
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json() as Promise<T>;
    } finally {
        clearTimeout(timer);
    }
}

export interface NotificationHttpClient {
    sendConfirmationEmail(input: SendConfirmationEmailInput): Promise<EmailHttpResponse>;
    sendNewReleaseEmail(input: SendNewReleaseEmailInput): Promise<EmailHttpResponse>;
}

export function createNotificationHttpClient(config: NotificationHttpClientConfig): NotificationHttpClient {
    const { baseUrl, timeoutMs = 5000 } = config;

    return {
        async sendConfirmationEmail(input: SendConfirmationEmailInput): Promise<EmailHttpResponse> {
            return postJson<EmailHttpResponse>(`${baseUrl}/api/email/send-confirmation`, input, timeoutMs);
        },

        async sendNewReleaseEmail(input: SendNewReleaseEmailInput): Promise<EmailHttpResponse> {
            return postJson<EmailHttpResponse>(`${baseUrl}/api/email/send-new-release`, input, timeoutMs);
        },
    };
}
