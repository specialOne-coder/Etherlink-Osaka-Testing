.PHONY: setup unit fork e2e onchain test test-all clean

setup:
	@echo "Setting up development environment..."
	@command -v foundryup >/dev/null 2>&1 || { echo "Installing Foundry..."; curl -L https://foundry.paradigm.xyz | bash; }
	@foundryup || true
	@command -v pnpm >/dev/null 2>&1 || { echo "pnpm not found. Installing..."; npm install -g pnpm; }
	@pnpm install
	@echo "Setup complete!"

unit:
	@echo "Running Foundry unit tests..."
	@forge test

fork:
	@echo "Running Foundry tests against Etherlink..."
	@if [ ! -f .env ]; then \
		echo "ERROR: .env file not found"; \
		echo "Please create .env with ETH_RPC_URL"; \
		exit 1; \
	fi
	@set -a && . ./.env && set +a && forge test --fork-url $$ETH_RPC_URL -vv

e2e:
	@echo "Building contracts..."
	@forge build > /dev/null
	@echo "Running TypeScript E2E tests..."
	@npm run test:e2e

onchain:
	@echo "Running onchain Osaka tests on Etherlink..."
	@if [ ! -f .env ]; then \
		echo "ERROR: .env file not found"; \
		echo "Please create .env with ETH_RPC_URL and PRIVATE_KEY"; \
		exit 1; \
	fi
	@set -a && . ./.env && set +a && forge build > /dev/null
	@set -a && . ./.env && set +a && npm run test:onchain

test: unit e2e
	@echo "All tests completed!"

test-all: unit e2e onchain
	@echo "All tests (local + fork + e2e + onchain) completed!"

clean:
	@echo "Cleaning build artifacts..."
	@forge clean
	@rm -rf out
	@rm -rf cache
	@echo "Clean complete!"




