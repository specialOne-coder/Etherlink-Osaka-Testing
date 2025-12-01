#!/usr/bin/env node
/**
 * @file instant-confirmations.ts
 * @notice Tests Etherlink's Instant Confirmations feature
 */

import { ethers } from "ethers";
import WebSocket from "ws";
import * as dotenv from "dotenv";
import { parseArgs } from "util";

dotenv.config();

interface PreconfirmationReceipt {
    blockHash: string;
    blockNumber: string | null;
    transactionHash: string;
    transactionIndex: string;
    from: string;
    to: string | null;
    gasUsed: string;
    cumulativeGasUsed: string;
    status: string;
    logs: any[];
    logsBloom: string;
    contractAddress: string | null;
}

async function testInstantConfirmations() {
    const args = parseArgs({
        options: {
            mode: { type: "string", default: "latest" },
            subscribe: { type: "boolean", default: false },
        },
    });

    const mode = args.values.mode || "latest";
    const shouldSubscribe = args.values.subscribe || false;

    if (mode !== "latest" && mode !== "pending") {
        console.error("ERROR: --mode must be 'latest' or 'pending'");
        process.exit(1);
    }

    const rpcUrl = process.env.ETH_RPC_URL;
    const wsUrl = process.env.WS_RPC_URL || rpcUrl?.replace(/^http/, "ws");
    const privateKey = process.env.PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

    if (!rpcUrl) {
        console.error("ERROR: ETH_RPC_URL environment variable not set");
        process.exit(1);
    }

    console.log(`Connecting to RPC: ${rpcUrl}`);
    if (shouldSubscribe && !wsUrl) {
        console.error("ERROR: WS_RPC_URL environment variable not set (required for --subscribe)");
        process.exit(1);
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);

    try {
        const testAddress = await wallet.getAddress();
        console.log(`Test account: ${testAddress}`);

        // Get current balance
        const balance = await provider.getBalance(testAddress);
        console.log(`Balance: ${ethers.formatEther(balance)} ETH`);

        if (balance === 0n) {
            console.error("ERROR: Test account has no balance. Please fund it first.");
            process.exit(1);
        }

        // Setup WebSocket if subscribing
        let ws: WebSocket | null = null;
        const txHashes = new Set<string>();
        const includedTxs = new Map<string, number>();
        const preconfirmedReceipts = new Map<string, { receipt: PreconfirmationReceipt; timestamp: number }>();

        if (shouldSubscribe && wsUrl) {
            console.log(`\nConnecting to WebSocket: ${wsUrl}`);
            ws = new WebSocket(wsUrl);

            ws.on("open", () => {
                console.log("✓ WebSocket connected");

                // Subscribe to tez_newIncludedTransactions
                const subscribeIncluded = {
                    jsonrpc: "2.0",
                    id: 1,
                    method: "eth_subscribe",
                    params: ["tez_newIncludedTransactions"],
                };
                ws!.send(JSON.stringify(subscribeIncluded));
                console.log("✓ Subscribed to tez_newIncludedTransactions");

                // Subscribe to tez_newPreconfirmedReceipts
                const subscribePreconfirmed = {
                    jsonrpc: "2.0",
                    id: 2,
                    method: "eth_subscribe",
                    params: ["tez_newPreconfirmedReceipts"],
                };
                ws!.send(JSON.stringify(subscribePreconfirmed));
                console.log("✓ Subscribed to tez_newPreconfirmedReceipts");
            });

            ws.on("message", (data: WebSocket.Data) => {
                try {
                    const message = JSON.parse(data.toString());
                    if (message.method === "tez_newIncludedTransactions") {
                        const txHash = message.params?.transactionHash;
                        if (txHash) {
                            includedTxs.set(txHash, Date.now());
                            console.log(`\n[WebSocket] Transaction included: ${txHash}`);
                            console.log(`  Timestamp: ${new Date().toISOString()}`);
                        }
                    } else if (message.method === "tez_newPreconfirmedReceipts") {
                        const receipt = message.params?.receipt;
                        if (receipt) {
                            const txHash = receipt.transactionHash;
                            preconfirmedReceipts.set(txHash, {
                                receipt,
                                timestamp: Date.now(),
                            });
                            console.log(`\n[WebSocket] Receipt preconfirmed: ${txHash}`);
                            console.log(`  Timestamp: ${new Date().toISOString()}`);
                            console.log(`  Status: ${receipt.status}`);
                            console.log(`  BlockHash: ${receipt.blockHash}`);
                        }
                    }
                } catch (err) {
                    // Ignore parse errors
                }
            });

            ws.on("error", (error) => {
                console.error("WebSocket error:", error);
            });

            // Wait a bit for subscriptions to be established
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        // Test 1: Latest mode (baseline)
        if (mode === "latest") {
            console.log("\n=== Test 1: Latest Mode (Baseline) ===");
            const startTime = Date.now();

            try {
                // Use a burn address to avoid self-transfer issues
                const burnAddress = "0x000000000000000000000000000000000000dEaD";

                // Estimate gas first
                const gasEstimate = await provider.estimateGas({
                    from: testAddress,
                    to: burnAddress,
                    value: ethers.parseEther("0.0001"),
                });
                console.log(`Estimated gas: ${gasEstimate.toString()}`);

                const tx = await wallet.sendTransaction({
                    to: burnAddress,
                    value: ethers.parseEther("0.0001"), // Small amount
                    gasLimit: gasEstimate,
                });
                console.log(`✓ Transaction sent: ${tx.hash}`);
                txHashes.add(tx.hash);

                // Wait for receipt using eth_sendRawTransactionSync equivalent
                // Note: ethers.js doesn't have direct support for eth_sendRawTransactionSync
                // We'll use the standard flow: sendTransaction + wait
                const receipt = await tx.wait();
                const endTime = Date.now();
                const duration = endTime - startTime;

                if (receipt?.status === 1) {
                    console.log(`✓ Receipt received after ${duration}ms`);
                    console.log(`  Block: ${receipt?.blockNumber}`);
                    console.log(`  BlockHash: ${receipt?.blockHash}`);
                    console.log(`  Status: success`);
                    console.log(`  Gas used: ${receipt?.gasUsed.toString()}`);
                } else {
                    console.log(`⚠ Transaction reverted after ${duration}ms`);
                    console.log(`  Block: ${receipt?.blockNumber}`);
                    console.log(`  Status: failure`);
                }

                // Check WebSocket events
                if (shouldSubscribe) {
                    const includedTime = includedTxs.get(tx.hash);
                    const preconfirmedTime = preconfirmedReceipts.get(tx.hash);
                    if (includedTime) {
                        console.log(`  Included at: ${new Date(includedTime).toISOString()}`);
                    }
                    if (preconfirmedTime) {
                        console.log(`  Preconfirmed at: ${new Date(preconfirmedTime.timestamp).toISOString()}`);
                    }
                }
            } catch (error: any) {
                console.error(`✗ Transaction failed: ${error.message}`);

                // Provide more context on the error
                if (error.code === "CALL_EXCEPTION") {
                    console.error("  This may be a node-specific validation issue");
                } else if (error.message.includes("gas")) {
                    console.error("  This appears to be a gas-related issue");
                } else {
                    console.error(`  Error code: ${error.code || "unknown"}`);
                }
            }
        }

        // Test 2: Pending mode (preconfirmation)
        if (mode === "pending") {
            console.log("\n=== Test 2: Pending Mode (Preconfirmation) ===");
            const startTime = Date.now();

            try {
                // Use a burn address to avoid self-transfer issues
                const burnAddress = "0x000000000000000000000000000000000000dEaD";

                // Estimate gas first
                const gasEstimate = await provider.estimateGas({
                    from: testAddress,
                    to: burnAddress,
                    value: ethers.parseEther("0.0001"),
                });
                console.log(`Estimated gas: ${gasEstimate.toString()}`);

                // Note: ethers.js doesn't directly support eth_sendRawTransactionSync with pending mode
                // We need to use the raw RPC call
                const tx = await wallet.populateTransaction({
                    to: burnAddress,
                    value: ethers.parseEther("0.0001"),
                    gasLimit: gasEstimate,
                });
                const signedTx = await wallet.signTransaction(tx);
                const rawTx = signedTx;

                // Call eth_sendRawTransactionSync with "pending" mode
                console.log("Calling eth_sendRawTransactionSync with 'pending' mode...");
                const receipt = await provider.send("eth_sendRawTransactionSync", [rawTx, "pending"]) as PreconfirmationReceipt;
                const endTime = Date.now();
                const duration = endTime - startTime;

                console.log(`✓ Preconfirmation receipt received after ${duration}ms`);
                console.log(`  TransactionHash: ${receipt.transactionHash}`);
                console.log(`  BlockHash: ${receipt.blockHash}`);
                console.log(`  BlockNumber: ${receipt.blockNumber}`);
                console.log(`  TransactionIndex: ${receipt.transactionIndex}`);
                console.log(`  Status: ${receipt.status === "0x1" ? "success" : "failure"}`);
                console.log(`  GasUsed: ${receipt.gasUsed}`);

                // Verify placeholder blockHash
                if (receipt.blockHash === "0x0000000000000000000000000000000000000000000000000000000000000000") {
                    console.log("  ✓ BlockHash is placeholder (0x0000...0000) as expected for preconfirmation");
                } else {
                    console.log("  ⚠ BlockHash is not placeholder - may be a finalized receipt");
                }

                // Wait a bit and check final receipt
                console.log("\nWaiting for final receipt...");
                await new Promise((resolve) => setTimeout(resolve, 5000));

                try {
                    const finalReceipt = await provider.getTransactionReceipt(receipt.transactionHash);
                    if (finalReceipt) {
                        console.log(`✓ Final receipt received`);
                        console.log(`  Block: ${finalReceipt.blockNumber}`);
                        console.log(`  BlockHash: ${finalReceipt.blockHash}`);
                        console.log(`  Status: ${finalReceipt.status === 1 ? "success" : "failure"}`);

                        // Compare with preconfirmation
                        if (finalReceipt.status === (receipt.status === "0x1" ? 1 : 0)) {
                            console.log("  ✓ Preconfirmation status matches final receipt");
                        } else {
                            console.log("  ⚠ Preconfirmation status differs from final receipt");
                        }
                    }
                } catch (err) {
                    console.log("  ⚠ Could not get final receipt (transaction may not be finalized yet)");
                }
            } catch (error: any) {
                const errorMsg = error.message?.toLowerCase() || "";
                const errorCode = error.code;

                if (errorCode === "METHOD_NOT_FOUND" || errorMsg.includes("method not found")) {
                    console.error("✗ eth_sendRawTransactionSync method not available");
                    console.error("  The Instant Confirmations feature may not be active on this node");
                } else if (errorCode === "CALL_EXCEPTION") {
                    console.error(`✗ Transaction failed: ${error.message}`);
                    console.error("  This may be a node-specific validation issue");
                } else {
                    console.error(`✗ Transaction failed: ${error.message}`);
                    console.error(`  Error code: ${errorCode || "unknown"}`);
                }
            }
        }

        // Wait a bit for WebSocket events
        if (shouldSubscribe) {
            console.log("\nWaiting for WebSocket events...");
            await new Promise((resolve) => setTimeout(resolve, 10000));
        }

        // Close WebSocket
        if (ws) {
            ws.close();
            console.log("\n✓ WebSocket closed");
        }

        console.log("\n✓ Instant Confirmations tests completed");
    } catch (error: any) {
        console.error("\nFatal error:", error.message);
        process.exit(1);
    }
}

testInstantConfirmations().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});




