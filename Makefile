.PHONY: prod-up
prod-up:
	docker compose -f docker-compose.yml up -d --build

.PHONY: prod-start
prod-start:
	docker compose -f docker-compose.yml up -d

.PHONY: prod-down
prod-down:
	docker compose -f docker-compose.yml down

.PHONY: prod-logs
prod-logs:
	docker compose -f docker-compose.yml logs -f

.PHONY: health
health:
	curl -f http://localhost:3000/api/health || exit 1

.PHONY: backup
backup:
	docker compose -f docker-compose.yml exec db pg_dump -U postgres releases > backup_$(shell date +%Y%m%d_%H%M%S).sql

.PHONY: elk-up
elk-up:
	docker compose -f docker-compose.yml --profile elk up -d

.PHONY: elk-down
elk-down:
	docker compose -f docker-compose.yml stop elasticsearch kibana filebeat
	docker compose -f docker-compose.yml rm -f elasticsearch kibana filebeat

.PHONY: elk-init
elk-init:
	docker run --rm \
		--network github-release-notifier_app-network \
		-v "$(CURDIR)/elasticsearch:/scripts:ro" \
		-e ELASTICSEARCH_URL=http://elasticsearch:9200 \
		-e KIBANA_URL=http://kibana:5601 \
		alpine sh -c "apk add --no-cache --quiet curl && sh /scripts/init.sh"

.PHONY: elk-logs
elk-logs:
	docker compose -f docker-compose.yml logs -f elasticsearch kibana filebeat

.PHONY: down-all
down-all:
	docker compose -f docker-compose.yml --profile elk down
