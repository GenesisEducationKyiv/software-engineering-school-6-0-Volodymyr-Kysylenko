import type {
    EmailConfirmationInput,
    EmailLinkBuilderPort,
    EmailMessage,
    EmailNewReleaseInput,
    EmailTemplatePort,
} from "./email.types.js";

export interface EmailTemplateConfig {
    from: string;
}

export class EmailTemplateBuilder implements EmailTemplatePort {
    constructor(
        private readonly config: EmailTemplateConfig,
        private readonly linkBuilder: EmailLinkBuilderPort,
    ) {}

    buildConfirmationEmail(input: EmailConfirmationInput): EmailMessage {
        const links = this.linkBuilder.buildConfirmationLinks(input.confirmToken, input.unsubscribeToken);

        return {
            from: this.config.from,
            to: input.to,
            subject: `Підтвердіть підписку на ${input.repo}`,
            text: [
                `Підтвердіть підписку на нові релізи репозиторію ${input.repo}.`,
                ``,
                `Посилання для підтвердження:`,
                `Браузер: ${links.confirmPageUrl}`,
                `API: ${links.confirmApiUrl}`,
                ``,
                `Посилання для відписки:`,
                `Браузер: ${links.unsubscribePageUrl}`,
                `API: ${links.unsubscribeApiUrl}`,
            ].join("\n"),
        };
    }

    buildNewReleaseEmail(input: EmailNewReleaseInput): EmailMessage {
        const links = this.linkBuilder.buildUnsubscribeLinks(input.unsubscribeToken);

        return {
            from: this.config.from,
            to: input.to,
            subject: `Новий реліз ${input.repo}: ${input.tagName}`,
            text: [
                `Опубліковано новий реліз репозиторію ${input.repo}.`,
                ``,
                `Версія: ${input.tagName}`,
                input.releaseName ? `Назва: ${input.releaseName}` : "",
                `Деталі: ${input.releaseUrl}`,
                ``,
                `Відписатися:`,
                `Браузер: ${links.unsubscribePageUrl}`,
                `API: ${links.unsubscribeApiUrl}`,
            ]
                .filter((line) => line !== "")
                .join("\n"),
        };
    }
}
