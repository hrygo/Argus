SHELL := /bin/bash
COMPOSE := docker compose --env-file .env.poc
ARGUS_BUILD_ID ?= $(shell git rev-parse HEAD)

.PHONY: validate validate-i18n build-langfuse-i18n validate-langfuse-integration up down logs bootstrap demo ps clean
validate:
	./scripts/validate.sh

validate-i18n:
	./deploy/langfuse/scripts/validate-i18n.sh

build-langfuse-i18n:
	./deploy/langfuse/scripts/build-image.sh

validate-langfuse-integration:
	./deploy/langfuse/scripts/validate-integration.sh

up:
	ARGUS_BUILD_ID=$(ARGUS_BUILD_ID) $(COMPOSE) up -d --build

down:
	$(COMPOSE) down

logs:
	$(COMPOSE) logs -f --tail=200

ps:
	$(COMPOSE) ps

bootstrap:
	./scripts/bootstrap.sh

demo:
	./scripts/run-demo.sh

clean:
	$(COMPOSE) down -v --remove-orphans

console-dev:
	pnpm --dir services/console dev

console-build:
	pnpm --dir services/console build

console-test:
	pnpm --dir services/console test

# Playwright drives `vite preview`, which serves dist/. Without the build
# first, the suite silently tests the previous bundle.
console-e2e: console-build
	pnpm --dir services/console test:e2e
