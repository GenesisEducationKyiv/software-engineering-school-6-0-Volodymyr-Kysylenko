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