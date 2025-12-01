#!/usr/bin/env node
/**
 * @file tx-gas-cap.ts
 * @notice Tests per-transaction gas limit cap (EIP-7825)
 * @dev EIP-7825 enforces a per-transaction gas limit cap of ~2^24 (16,777,216 gas).
 *      NOTE: EIP-7825 is NOT enabled on Etherlink and this test is skipped.
 *      Also note: EIP-7935 (60M default gas limit) is NOT enabled on Etherlink.
 */

import { ethers } from "ethers";
import * as dotenv from "dotenv";

dotenv.config();

async function testTxGasCap() {
    const rpcUrl = process.env.ETH_RPC_URL;

    if (!rpcUrl) {
        console.error("ERROR: ETH_RPC_URL environment variable not set");
        process.exit(1);
    }

    console.log(`Connecting to RPC: ${rpcUrl}`);
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    try {
        console.log("\n=== EIP-7825 Transaction Gas Limit Cap ===");
        console.log("⚠ EIP-7825 is NOT enabled on Etherlink");
        console.log("  Etherlink does not implement the per-transaction gas limit cap (~2^24 gas)");
        console.log("  This test is skipped for Etherlink nodes");
        console.log("\n=== EIP-7935 Default Gas Limit (60M) ===");
        console.log("⚠ EIP-7935 is NOT enabled on Etherlink");
        console.log("  Etherlink does not implement the 60M default gas limit per block");
        console.log("  This test is skipped for Etherlink nodes");
        console.log("\n✓ Gas cap tests skipped (EIP-7825 and EIP-7935 not applicable to Etherlink)");
    } catch (error: any) {
        console.error("\nFatal error:", error.message);
        process.exit(1);
    }
}

testTxGasCap().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});




