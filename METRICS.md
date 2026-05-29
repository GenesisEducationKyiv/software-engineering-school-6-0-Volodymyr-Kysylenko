# Prometheus Metrics

| Endpoint                           | Description               |
| ---------------------------------- | ------------------------- |
| `GET /api/metrics`                 | Prometheus-format metrics |
| `GET /api/health`                  | Service health check      |
| Grafana `http://localhost:3001`    | Dashboard (admin / admin) |
| Prometheus `http://localhost:9090` | Raw time-series data      |

---

## HTTP — RED Instrumentation

Captured automatically for every request by `http-metrics.middleware.ts`.

| Metric                          | Type      | Labels                           | Buckets    |
| ------------------------------- | --------- | -------------------------------- | ---------- |
| `http_requests_total`           | Counter   | `method`, `route`, `status_code` | —          |
| `http_request_duration_seconds` | Histogram | `method`, `route`, `status_code` | 5 ms → 5 s |
| `http_requests_in_flight`       | Gauge     | `method`                         | —          |

`route` uses the Express pattern (e.g. `/api/subscriptions/:token`). Unmatched paths are normalized: UUIDs → `/:uuid`, numeric IDs → `/:id`.

---

## Business Metrics

### GitHub API

| Metric                                      | Type      | Labels           | Buckets      |
| ------------------------------------------- | --------- | ---------------- | ------------ |
| `github_notifier_api_calls_total`           | Counter   | `status`, `type` | —            |
| `github_notifier_api_call_duration_seconds` | Histogram | `type`           | 50 ms → 10 s |

`type` values: `releases` · `rate_limit` · `other`

### Email

| Metric                                   | Type      | Labels   | Buckets     |
| ---------------------------------------- | --------- | -------- | ----------- |
| `github_notifier_emails_sent_total`      | Counter   | `status` | —           |
| `github_notifier_email_duration_seconds` | Histogram | `type`   | 50 ms → 5 s |

`type` values: `confirmation` · `release`

### Scanner

| Metric                                         | Type      | Labels   | Buckets        |
| ---------------------------------------------- | --------- | -------- | -------------- |
| `github_notifier_scanner_runs_total`           | Counter   | `status` | —              |
| `github_notifier_scanner_run_duration_seconds` | Histogram | —        | 500 ms → 120 s |

### Subscriptions

| Metric                                 | Type  | Labels |
| -------------------------------------- | ----- | ------ |
| `github_notifier_active_subscriptions` | Gauge | —      |

---

`status` values for all counters: `success` · `error`

---

## Node.js Default Metrics

Collected via `prom-client.collectDefaultMetrics()`.

| Metric                                     | Description                |
| ------------------------------------------ | -------------------------- |
| `process_cpu_user_seconds_total`           | User CPU time              |
| `process_cpu_system_seconds_total`         | System CPU time            |
| `process_cpu_seconds_total`                | Total CPU time             |
| `process_resident_memory_bytes`            | RSS memory                 |
| `process_heap_bytes`                       | V8 heap size               |
| `process_open_fds`                         | Open file descriptors      |
| `nodejs_heap_size_total_bytes`             | Total heap allocated       |
| `nodejs_heap_size_used_bytes`              | Heap in use                |
| `nodejs_external_memory_bytes`             | External memory (Buffers)  |
| `nodejs_heap_space_size_*`                 | Per-space heap stats       |
| `nodejs_eventloop_lag_seconds`             | Event-loop lag             |
| `nodejs_eventloop_lag_p50/p90/p99_seconds` | Event-loop lag percentiles |
| `nodejs_gc_duration_seconds`               | GC pause duration          |
| `nodejs_active_handles_total`              | Active libuv handles       |
| `nodejs_active_requests_total`             | Active libuv requests      |
| `nodejs_version_info`                      | Node.js version label      |

---

## Monitoring Stack

```bash
make monitoring-up    # start Prometheus :9090 + Grafana :3001
make monitoring-down  # stop
make monitoring-logs  # tail logs
```

Prometheus scrapes `/api/metrics` every **15 s**, retains data for **15 days**.  
Grafana dashboard auto-provisions from [`grafana/dashboards/github-notifier.json`](grafana/dashboards/github-notifier.json).
