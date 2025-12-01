# Osaka Execution-Layer Test Suite for Etherlink 6.0

Comprehensive automated test suite to validate Etherlink 6.0's alignment with the Osaka execution-layer upgrade and the new Instant Confirmations feature.

## Overview

This test suite covers:

- **Osaka Execution-Layer EIPs**: EIP-7910, 7825, 7934, 7939, 7951, 7823, 7883
- **Instant Confirmations**: Etherlink-specific feature for pre-confirmation receipts
- **Regression Testing**: Ensures previous upgrades (Pectra/Prague) remain functional

## Quick Start

```bash
# Setup
make setup

# Run unit tests (local)
make unit

# Run unit tests against Etherlink (fork mode)
make fork

# deploy and run the unit tests onchain
make onchain

# Run E2E tests (requires ETH_RPC_URL)
make e2e

# Run local unit + E2E tests
make test

# Run ALL tests (local + fork + E2E + onchain)
make test-all
```

## Documentation

- [OSAKA-EIPS.md](./docs/OSAKA-EIPS.md) - Detailed EIP information and test mapping
- [INSTANT-CONFIRMATIONS.md](./docs/INSTANT-CONFIRMATIONS.md) - Instant Confirmations feature documentation
- [RUNBOOK.md](./docs/RUNBOOK.md) - Complete testing guide

## Test Structure

### Solidity Contracts (`/contracts`)
- `ClzDemo.sol` - CLZ opcode demonstration
- `Secp256r1Verifier.sol` - secp256r1 precompile wrapper
- `ModExpProbe.sol` - ModExp precompile testing

### Foundry Tests (`/test/solidity`)
- `ForkActivation_Osaka.t.sol` - Fork activation tests
- `GasAndSizeCaps_Osaka.t.sol` - Gas and size limit tests
- `ClzOpcode_Osaka.t.sol` - CLZ opcode tests
- `Secp256r1_Osaka.t.sol` - secp256r1 precompile tests
- `ModExp_Osaka.t.sol` - ModExp precompile tests
- `Regression_Pectra_Prague.t.sol` - Regression tests

### TypeScript E2E Scripts (`/scripts/ts`) test node level features
- `check-eth-config.ts` - Validates `eth_config` RPC
- `tx-gas-cap.ts` - Tests transaction gas limit cap
- `rlp-blocksize-probe.ts` - Tests RLP block size limits
- `instant-confirmations.ts` - Tests Instant Confirmations feature

## Configuration

Create a `.env` file:

```bash
ETH_RPC_URL=http://localhost:8545
WS_RPC_URL=ws://localhost:8546
PRIVATE_KEY=0x...
OSAKA_FORK_BLOCK=12345
```

## Requirements

- Node.js 20+
- Foundry (forge, cast, anvil)
- pnpm (or npm/yarn)
- Access to Etherlink 6.0 node (for E2E tests)

## License

MIT


