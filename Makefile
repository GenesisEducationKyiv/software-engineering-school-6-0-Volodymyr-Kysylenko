COMPOSE = docker compose -f docker-compose.yml
NETWORK = github-release-notifier_app-network

# ── Base ──────────────────────────────────────────────────────────────────────

.PHONY: prod-up
prod-up:
	$(COMPOSE) up -d --build

.PHONY: prod-start
prod-start:
	$(COMPOSE) up -d

.PHONY: prod-down
prod-down:
	$(COMPOSE) down

.PHONY: prod-logs
prod-logs:
	$(COMPOSE) logs -f

.PHONY: health
health:
	curl -f http://localhost:3000/api/health || exit 1

.PHONY: backup
backup:
	$(COMPOSE) exec db pg_dump -U postgres releases > backup_$(shell date +%Y%m%d_%H%M%S).sql

# ── ELK ───────────────────────────────────────────────────────────────────────

.PHONY: elk-up
elk-up:
	$(COMPOSE) --profile elk up -d

.PHONY: elk-down
elk-down:
	$(COMPOSE) rm -f --stop elasticsearch kibana filebeat

.PHONY: elk-init
elk-init:
	docker run --rm \
		--network $(NETWORK) \
		-v "$(CURDIR)/elasticsearch:/scripts:ro" \
		-e ELASTICSEARCH_URL=http://elasticsearch:9200 \
		-e KIBANA_URL=http://kibana:5601 \
		alpine sh -c "apk add --no-cache --quiet curl && sh /scripts/init.sh"

.PHONY: elk-logs
elk-logs:
	$(COMPOSE) logs -f elasticsearch kibana filebeat

# ── Monitoring ────────────────────────────────────────────────────────────────

.PHONY: monitoring-up
monitoring-up:
	$(COMPOSE) --profile monitoring up -d

.PHONY: monitoring-down
monitoring-down:
	$(COMPOSE) rm -f --stop prometheus grafana

.PHONY: monitoring-logs
monitoring-logs:
	$(COMPOSE) logs -f prometheus grafana

# ── Full infrastructure ───────────────────────────────────────────────────────

.PHONY: infra-up
infra-up:
	$(COMPOSE) --profile elk --profile monitoring up -d --build

.PHONY: infra-down
infra-down:
	$(COMPOSE) --profile elk --profile monitoring down
