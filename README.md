# GitHub Release Notifier

Сервіс для підписки на сповіщення електронною поштою про нові релізи GitHub-репозиторіїв.

## Деплой API:

[Підписка на нові сповіщення](https://github-release-notifier.sylenity.com/)

[Переглянути підписки](https://github-release-notifier.sylenity.com/subscriptions)

[Swagger](https://github-release-notifier.sylenity.com/swagger)

[Метрики](https://github-release-notifier.sylenity.com/api/metrics)

[Health сервісу](https://github-release-notifier.sylenity.com/api/health)

**gRPC на окремому домені**: grpc-github-release-notifier.sylenity.com

## Стек

- Node.js v.22
- TypeScript
- Express
- gRPC (альтернативний інтерфейс)
- Nodemailer
- Vitest
- PostgreSQL
- Docker
- Redis
- Winston (структуроване логування)
- Elasticsearch + Kibana + Filebeat (ELK-стек)

## Що реалізовано

- API за наданим Swagger
- `POST /api/subscribe` - створення підписки
- `GET /api/confirm/{token}` - підтвердження підписки
- `GET /api/unsubscribe/{token}` - відписка
- `GET /api/subscriptions?email=...` - список активних підписок
- перевірка формату `owner/repo`
- перевірка існування репозиторію через GitHub API
- збереження `last_seen_tag` і надсилання листів лише при появі нового релізу
- обробка rate limit GitHub API
- періодичне сканування релізів для всіх активних підтверджених підписок
- автоматичні міграції при старті сервісу
- gRPC інтерфейс як альтернатива REST API з тими ж методами
- зберігання всіх даних у PostgreSQL
- Redis кешування відповідей GitHub API з TTL 10 хвилин
- unit-тести
- інтеграційні тести
- Dockerfile і docker-compose для повного запуску
- сторінки підписки, підтвердження підписки, відписки, перегляду підписок
- деплой на VPS (Ubuntu + Nginx як reverse proxy)
- структуроване JSON-логування через Winston з полями `service`, `version`, `environment`, `context`, `hostname`
- конвеєр логів: Filebeat → Elasticsearch → Kibana (опціональний профіль `elk`)

## Структура

```txt
└── 📁github-release-notifier
    └── 📁.github
        └── 📁workflows
            ├── ci.yml
    └── 📁migrations
        ├── 001_init.sql
    └── 📁proto
        ├── subscription.proto
    └── 📁public
        └── 📁assets
            ├── app.css
            ├── home.js
            ├── subscriptions.js
        ├── confirm.html
        ├── error.html
        ├── index.html
        ├── subscriptions.html
        ├── unsubscribe.html
    └── 📁src
        └── 📁__tests__
            └── 📁integration
                ├── subscription.integration.test.ts
            ├── basic.test.ts
            ├── cache.service.test.ts
            ├── grpc.service.test.ts
            ├── metrics.service.test.ts
            ├── scanner.logic.test.ts
            ├── validators.test.ts
        └── 📁config
            ├── env.ts
        └── 📁container
            ├── container.ts
        └── 📁controllers
            ├── metrics.controller.ts
            ├── subscription.controller.ts
        └── 📁db
            ├── migrate.ts
            ├── pool.ts
        └── 📁dto
            ├── subscription.dto.ts
        └── 📁grpc
            ├── client.ts
            ├── server.ts
            ├── subscription.handlers.ts
        └── 📁middleware
            ├── error-handler.ts
            ├── origin.middleware.ts
            ├── request.middleware.ts
        └── 📁repositories
            ├── subscription.repository.ts
        └── 📁routes
            ├── metrics.routes.ts
            ├── subscription.routes.ts
        └── 📁services
            ├── cache.service.ts
            ├── email.service.ts
            ├── github.service.ts
            ├── health.service.ts
            ├── metrics.service.ts
            ├── scanner.logic.ts
            ├── scanner.service.ts
            ├── subscription.service.ts
        └── 📁types
            ├── subscription.ts
        └── 📁utils
            ├── async-handler.ts
            ├── crypto.ts
            ├── errors.ts
            ├── logger.ts
            ├── validators.ts
        ├── app.ts
        ├── server.ts
    ├── .dockerignore
    ├── .env.development (private)
    ├── .env.example
    ├── .env.production (private)
    ├── .env.test (private)
    ├── .gitignore
    ├── docker-compose.yml
    ├── Dockerfile
    ├── eslint.config.js
    ├── Makefile
    ├── METRICS.md
    ├── package.json
    ├── pnpm-lock.yaml
    ├── README.md
    ├── swagger.yaml
    └── tsconfig.json
```

## gRPC API

Паралельно з REST API доступний gRPC інтерфейс.

### Сервіси:

- `Subscribe(email, repo)` - підписка на репозиторій
- `Confirm(token)` - підтвердження підписки
- `Unsubscribe(token)` - відписка
- `GetSubscriptions(email)` - активні підписки

### Proto:

[`proto/subscription.proto`](proto/subscription.proto).

## Запуск

### Змінні середовища

Всі необхідні змінні описано в [.env.example](.env.example).

### Обов'язкові

- `DATABASE_URL`
- `REDIS_URL`
- `SMTP_*`

### Для тестування

- `GITHUB_TOKEN` - необов'язково
- Для тестування SMTP можна використовувати MailHog або інший сервіс

### Налаштування середовища

```bash
# Встановіть залежності
pnpm install

# Скопіюйте та налаштуйте змінні середовища
cp .env.example .env.development    # Для розробки
cp .env.example .env.production     # Для продакшену
cp .env.example .env.test          # Для тестів

# Відредагуйте .env.development та інші файли відповідно до вашого середовища
```

### Локальний запуск (development)

```bash
# З локальними сервісами без Docker
pnpm run dev                # Development mode з hot reload
```

### Команди для розробки

```bash
# Dev
pnpm run dev              # Development з .env.development
pnpm run dev:prod         # Development з .env.production

# Prod
pnpm run build            # Компіляція TypeScript
pnpm run start            # Запуск production версії
pnpm run start:dev        # Запуск development версії зібраного коду

# DB
pnpm run test:watch       # Тести в watch режимі
pnpm run migrate          # Виконати міграції (development)
pnpm run migrate:prod     # Виконати міграції (production)

# Тести
pnpm run test:unit         # Unit
pnpm run test:integration  # Integration
pnpm run test:e2e          # E2E
pnpm run test:all          # Усі

# Лінтинг
pnpm run lint             # Перевірка коду
pnpm run lint:fix         # Автоматичне виправлення
```

## Docker

### Повний запуск з Docker (через make)

```bash
# Запуск
make prod-up              # docker compose up -d --build

# Управління
make prod-start           # без rebuild
make prod-down            # зупинка
make prod-logs            # логи

# Перевірка здоров'я
make health               # curl http://localhost:3000/api/health

# Бекап DB
make backup
```

## ELK-стек (логування)

Конвеєр логів запускається окремим Docker Compose профілем і не впливає на основний стек.

```bash
make elk-up     # піднімає Elasticsearch :9200, Kibana :5601, Filebeat
make elk-init   # одноразово: застосовує index template + створює Data View в Kibana
make elk-down   # зупинка
make elk-logs   # логи ELK-сервісів
```

Після `elk-init` відкрити **http://localhost:5601 → Discover → "GitHub Notifier Logs"**.

Кожен лог містить поля `level`, `message`, `service`, `version`, `environment`, `context`, `hostname` та HTTP-специфічні поля (`requestId`, `method`, `url`, `statusCode`, `duration`). Помилки серіалізуються в `errorMessage`, `errorName`, `stack`.

## Docker конфіг

- **Multi-stage Dockerfile**
- **Non-root user**
- **Resource limits**
- **Health checks**
- **Закриті порти** - DB та Redis
- **Логи** - ротація логів з обмеженням розміру
