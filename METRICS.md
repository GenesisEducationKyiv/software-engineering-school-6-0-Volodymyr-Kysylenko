# Prometheus метрики

- **Health**: `GET /api/health` - Перевірка стану сервісу
- **Метрики**: `GET /api/metrics` - Метрики у форматі Prometheus

### HTTP
- `http_requests_total` - Загальна кількість HTTP запитів
- `http_request_duration_seconds` - Тривалість HTTP запитів
- `http_requests_in_flight` - Кількість поточних HTTP запитів

### Системні
- `process_cpu_user_seconds_total` - Час CPU користувача
- `process_cpu_system_seconds_total` - Час системного CPU
- `process_resident_memory_bytes` - Використання пам'яті
- `memory_usage_bytes` - RSS, heap used, heap total, external
- `nodejs_version_info` - Версія node
- `nodejs_eventloop_lag_seconds` - Затримка EL

### Бізнес метрики
- `active_subscriptions_total` - Кількість активних підписок
- `github_api_calls_total` - Кількість викликів GitHub API
- `emails_sent_total` - Кількість відправлених email