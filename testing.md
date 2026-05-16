# Testing

## Before running tests

```bash
pnpm install
```

For integration and e2e tests, make sure Docker is running.

## Run all tests with one command

```bash
pnpm run test:all
```

## Run each test type separately

```bash
pnpm run test:unit
pnpm run test:integration
pnpm run test:e2e
```

## Note

`integration` and `e2e` require Docker to be running (scripts automatically start and stop the test environment via `docker-compose.test.yml`).
