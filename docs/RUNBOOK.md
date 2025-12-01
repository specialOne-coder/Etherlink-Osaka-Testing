# Test Suite Runbook

This document provides step-by-step instructions for running the Osaka execution-layer test suite for Etherlink 6.0.

## Prerequisites

- Node.js 20 or higher
- Foundry (forge, cast, anvil)
- pnpm (or npm/yarn)
- Access to an Etherlink 6.0 node (for E2E tests)

## Initial Setup

### 1. Install Dependencies

```bash
make setup
```

This will:
- Install Foundry (via `foundryup` if not already installed)
- Install Node.js dependencies via pnpm

### 2. Configure Environment Variables

Create a `.env` file in the project root:

```bash
# Required for E2E tests
ETH_RPC_URL=http://localhost:8545
WS_RPC_URL=ws://localhost:8546

# Optional overrides
OSAKA_FORK_BLOCK=12345
PRIVATE_KEY=0x...
```

## Running Tests

### Unit Tests (Foundry)

Run all Solidity tests:

```bash
make unit
```

Or directly with forge:

```bash
forge test
```

Run specific test files:

```bash
forge test --match-path test/solidity/ClzOpcode_Osaka.t.sol
```

Run with verbosity:

```bash
forge test -vvv
```

### End-to-End Tests (TypeScript)

Run all E2E tests:

```bash
make e2e
```

Run individual test scripts:

```bash
# Check eth_config RPC
npm run test:config

# Test transaction gas cap
npm run test:tx-gas-cap

# Test RLP block size limits
npm run test:rlp-blocksize

# Test Instant Confirmations
npm run test:instant-confirmations -- --mode=latest
npm run test:instant-confirmations -- --mode=pending
npm run test:instant-confirmations -- --mode=pending --subscribe
```

### Run All Tests

```bash
make test
```

This runs both unit tests and E2E tests sequentially.

## Test Categories

### 1. Fork Activation Tests

**File**: `test/solidity/ForkActivation_Osaka.t.sol`

Tests that Osaka fork features (CLZ opcode, secp256r1 precompile) are available after fork activation.

**Run**:
```bash
forge test --match-contract ForkActivation
```

### 2. Gas and Size Cap Tests

**Files**: 
- `test/solidity/GasAndSizeCaps_Osaka.t.sol`
- `scripts/ts/tx-gas-cap.ts`
- `scripts/ts/rlp-blocksize-probe.ts`

Tests per-transaction gas limit (EIP-7825) and RLP block size limit (EIP-7934).

**Run**:
```bash
forge test --match-contract GasAndSizeCaps
npm run test:tx-gas-cap
npm run test:rlp-blocksize
```

### 3. CLZ Opcode Tests

**Files**:
- `contracts/ClzDemo.sol`
- `test/solidity/ClzOpcode_Osaka.t.sol`

Tests the Count Leading Zeros opcode (EIP-7939).

**Run**:
```bash
forge test --match-contract ClzOpcode
```

### 4. secp256r1 Precompile Tests

**Files**:
- `contracts/Secp256r1Verifier.sol`
- `test/solidity/Secp256r1_Osaka.t.sol`

Tests the secp256r1 (P-256) precompile (EIP-7951).

**Run**:
```bash
forge test --match-contract Secp256r1
```

### 5. ModExp Tests

**Files**:
- `contracts/ModExpProbe.sol`
- `test/solidity/ModExp_Osaka.t.sol`

Tests ModExp precompile bounds (EIP-7823) and gas cost changes (EIP-7883).

**Run**:
```bash
forge test --match-contract ModExp
```

### 6. Regression Tests

**File**: `test/solidity/Regression_Pectra_Prague.t.sol`

Sanity checks to ensure previous upgrades (e.g., EIP-7702) still work after Osaka.

**Run**:
```bash
forge test --match-contract Regression
```

### 7. RPC Tests

**File**: `scripts/ts/check-eth-config.ts`

Validates the `eth_config` RPC method (EIP-7910) and compares against expected structure.

**Run**:
```bash
npm run test:config
```

### 8. Instant Confirmations Tests

**File**: `scripts/ts/instant-confirmations.ts`

Tests Etherlink's Instant Confirmations feature.

**Run**:
```bash
# Latest mode (baseline)
npm run test:instant-confirmations -- --mode=latest

# Pending mode (preconfirmation)
npm run test:instant-confirmations -- --mode=pending

# With WebSocket subscriptions
npm run test:instant-confirmations -- --mode=pending --subscribe
```

## CI/CD

Tests run automatically on GitHub Actions for:
- Every push to main/master
- Every pull request

The CI workflow:
1. Runs all Foundry unit tests
2. Runs selected E2E tests (if `ETH_RPC_URL` and `WS_RPC_URL` secrets are configured)

## Troubleshooting

### Foundry Tests Failing

- **Issue**: Tests fail with "opcode not available"
  - **Solution**: Ensure `evm_version = "latest"` in `foundry.toml` or use a specific Osaka-compatible version

- **Issue**: Tests fail with gas estimation errors
  - **Solution**: Check that the fork activation block is correctly configured

### E2E Tests Failing

- **Issue**: Connection refused to RPC endpoint
  - **Solution**: Verify `ETH_RPC_URL` and `WS_RPC_URL` are correct and the node is running

- **Issue**: `eth_config` response doesn't match expected structure
  - **Solution**: Update `/docs/fixtures/eth_config.expected.json` if Etherlink's response format differs

- **Issue**: Instant Confirmations tests hang
  - **Solution**: The feature may not be active yet. Test with `--mode=latest` first to verify basic connectivity

### Gas Limit Errors

- **Issue**: Transactions rejected due to gas limits
  - **Solution**: Check `eth_config` for actual gas limits. Etherlink may have custom values different from standard Ethereum.

## Expected Test Durations

- **Unit tests**: ~30-60 seconds
- **E2E tests (individual)**: ~5-30 seconds per script
- **Full test suite**: ~2-5 minutes

## Next Steps

After running tests:

1. Review test output for any failures
2. Check logs for detailed error messages
3. Update fixtures if Etherlink's behavior differs (document why)
4. Report issues to Etherlink core team if tests reveal non-compliance

## Additional Resources

- [OSAKA-EIPS.md](./OSAKA-EIPS.md) - Detailed EIP information
- [INSTANT-CONFIRMATIONS.md](./INSTANT-CONFIRMATIONS.md) - Instant Confirmations feature documentation
- [Ethereum EIPs](https://eips.ethereum.org/) - Official EIP specifications




