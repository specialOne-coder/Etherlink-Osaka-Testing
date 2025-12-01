# Osaka Execution-Layer EIPs

This document summarizes the execution-layer EIPs from the Osaka upgrade that are relevant to Etherlink 6.0.

## EIP Matrix

| EIP  | Title                         | Category (gas/size/opcode/precompile/RPC) | Status on Etherlink | Expected behavior on Etherlink | Test file(s) |
|------|------------------------------|-------------------------------------------|---------------------|--------------------------------|--------------|
| 7910 | `eth_config` JSON-RPC Method | RPC                                       | ✅ Enabled          | Exposes chain and fork parameters via `eth_config` RPC. Reports Osaka fork activation block/timestamp, gas limits, block size limits, and other chain configuration. | `scripts/ts/check-eth-config.ts`, `test/solidity/ForkActivation_Osaka.t.sol` |
| 7825 | Transaction Gas Limit Cap     | Gas                                       | ❌ NOT Enabled      | **Skipped**: Etherlink does not implement the per-transaction gas limit cap (~2²⁴ = 16,777,216 gas). | `scripts/ts/tx-gas-cap.ts` (skips with explanation) |
| 7935 | 60M Default Gas Limit         | Gas                                       | ❌ NOT Enabled      | **Skipped**: Etherlink does not implement the 60M default gas limit per block. | `scripts/ts/tx-gas-cap.ts` (skips with explanation) |
| 7934 | RLP Execution Block Size Limit | Size                                      | ✅ Enabled          | Enforces RLP-encoded execution block size cap (10 MiB). Blocks exceeding this size are rejected. | `test/solidity/GasAndSizeCaps_Osaka.t.sol`, `scripts/ts/rlp-blocksize-probe.ts` |
| 7939 | Count Leading Zeros (CLZ) Opcode | Opcode                                  | ✅ Enabled          | Adds CLZ opcode (0x5c) to EVM. Counts leading zero bits in a 256-bit value. Returns 256 for input 0. | `contracts/ClzDemo.sol`, `test/solidity/ClzOpcode_Osaka.t.sol`, `scripts/ts/test-osaka-onchain.ts` |
| 7951 | Precompile for secp256r1 Curve Support | Precompile                            | ✅ Enabled          | Adds secp256r1 (P-256) precompile at address 0x100. Accepts 64-byte public key (x, y), 32-byte message hash, 64-byte signature (r, s). Returns 1 for valid signature, 0 otherwise. | `contracts/Secp256r1Verifier.sol`, `test/solidity/Secp256r1_Osaka.t.sol`, `scripts/ts/test-osaka-onchain.ts` |
| 7823 | Set Upper Bounds for MODEXP   | Precompile                                | ✅ Enabled          | Sets upper bounds on MODEXP precompile input sizes (base, exponent, modulus). Inputs exceeding bounds are rejected or very expensive. | `contracts/ModExpProbe.sol`, `test/solidity/ModExp_Osaka.t.sol`, `scripts/ts/test-osaka-onchain.ts` |
| 7883 | ModExp Gas Cost Increase      | Gas                                       | ✅ Enabled          | Increases gas costs for MODEXP precompile operations to better reflect computational complexity. | `contracts/ModExpProbe.sol`, `test/solidity/ModExp_Osaka.t.sol`, `scripts/ts/test-osaka-onchain.ts` |

## Notes

- **Fork Activation**: Osaka fork activation is detected via `eth_config` RPC method. The exact block number or timestamp may vary for Etherlink.
- **EIPs NOT Enabled on Etherlink**: 
  - **EIP-7825** (Transaction Gas Limit Cap): Not implemented. Tests skip with clear explanation.
  - **EIP-7935** (60M Default Gas Limit): Not implemented. Tests skip with clear explanation.
- **Testing Strategy**: Each EIP is tested both at the contract level (Foundry tests) and at the RPC level (TypeScript E2E scripts) where applicable. EIPs that are not enabled on Etherlink are explicitly skipped with documentation.

## References

- [EIP-7910: eth_config JSON-RPC Method](https://eips.ethereum.org/EIPS/eip-7910)
- [EIP-7825: Transaction Gas Limit Cap](https://eips.ethereum.org/EIPS/eip-7825)
- [EIP-7934: RLP Execution Block Size Limit](https://eips.ethereum.org/EIPS/eip-7934)
- [EIP-7939: Count Leading Zeros (CLZ) Opcode](https://eips.ethereum.org/EIPS/eip-7939)
- [EIP-7951: Precompile for secp256r1 Curve Support](https://eips.ethereum.org/EIPS/eip-7951)
- [EIP-7823: Set Upper Bounds for MODEXP](https://eips.ethereum.org/EIPS/eip-7823)
- [EIP-7883: ModExp Gas Cost Increase](https://eips.ethereum.org/EIPS/eip-7883)




