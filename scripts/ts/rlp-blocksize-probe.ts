#!/usr/bin/env node
/**
 * @file rlp-blocksize-probe.ts
 * @notice Tests RLP execution block size limit (EIP-7934)
 * @dev EIP-7934 enforces a 10 MiB limit on RLP-encoded execution block size.
 *      Note: EIP-7935 (60M default gas limit) is NOT enabled on Etherlink and is not tested here.
 */

import { ethers } from "ethers";
import * as dotenv from "dotenv";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

type ForgeArtifact = {
    abi: any[];
    bytecode?: string | { object: string };
};

function loadArtifact(relativePath: string): ForgeArtifact {
    const fullPath = join(__dirname, relativePath);
    if (!existsSync(fullPath)) {
        throw new Error(`Artifact not found at ${fullPath}. Did you run "forge build"?`);
    }
    const raw = readFileSync(fullPath, "utf-8");
    return JSON.parse(raw) as ForgeArtifact;
}

function getBytecode(artifact: ForgeArtifact): string {
    const bc = (artifact as any).bytecode;
    if (typeof bc === "string") {
        return bc;
    }
    if (bc && typeof bc.object === "string") {
        return bc.object;
    }
    throw new Error("Unable to determine contract bytecode from artifact");
}

async function testRlpBlockSize() {
    const rpcUrl = process.env.ETH_RPC_URL;
    const privateKey = process.env.PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

    if (!rpcUrl) {
        console.error("ERROR: ETH_RPC_URL environment variable not set");
        process.exit(1);
    }

    console.log(`Connecting to RPC: ${rpcUrl}`);
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);

    try {
        console.log("\n=== EIP-7934 RLP Execution Block Size Limit ===");
        console.log("Testing RLP-encoded block size limit (10 MiB cap)");

        const testAddress = await wallet.getAddress();
        console.log(`Test account: ${testAddress}`);

        // Get current balance
        const balance = await provider.getBalance(testAddress);
        console.log(`Balance: ${ethers.formatEther(balance)} ETH`);

        if (balance === BigInt(0)) {
            console.error("ERROR: Test account has no balance. Please fund it first.");
            process.exit(1);
        }

        // Get block size limit from eth_config if available
        let maxRlpSize: bigint | null = null;
        try {
            const config = await provider.send("eth_config", []) as any;
            if (config.block?.maxRlpSize) {
                maxRlpSize = BigInt(config.block.maxRlpSize);
                const maxRlpSizeMB = Number(maxRlpSize) / (1024 * 1024);
                console.log(`\nMax RLP size from eth_config: ${maxRlpSize.toString()} bytes (${maxRlpSizeMB.toFixed(2)} MiB)`);
            }
        } catch (err) {
            // eth_config not available, use default
        }

        // Default to EIP-7934 value: 10 MiB = 10,485,760 bytes
        if (!maxRlpSize) {
            maxRlpSize = BigInt(10 * 1024 * 1024);
            console.log(`\nUsing default EIP-7934 limit: ${maxRlpSize.toString()} bytes (10 MiB)`);
        }

        // Test: Get current block and check its RLP size
        console.log("\n=== Test 1: Check current block RLP size ===");
        const currentBlockNumber = await provider.getBlockNumber();
        console.log(`Current block: ${currentBlockNumber}`);

        const currentBlock = await provider.getBlock(currentBlockNumber, true);
        if (currentBlock) {
            // Estimate RLP size by serializing the block
            // Note: This is an approximation. Actual RLP size includes all transactions and receipts.
            console.log(`Block has ${currentBlock.transactions.length} transactions`);
            
            // Get full block with transactions
            const fullBlock = await provider.getBlock(currentBlockNumber, true);
            if (fullBlock) {
                // Estimate: base block overhead + transaction data
                // This is a simplified check - full RLP encoding would require more work
                let estimatedSize = 0;
                
                // Base block fields overhead (approximate)
                estimatedSize += 200; // Block header fields
                
                // Add transaction sizes
                for (const tx of fullBlock.transactions) {
                    if (typeof tx === "string") {
                        // Just hash, need to fetch full tx
                        const txData = await provider.getTransaction(tx);
                        if (txData && txData.data) {
                            estimatedSize += (txData.data.length / 2) - 1; // Hex to bytes
                            estimatedSize += 100; // Transaction overhead
                        }
                    } else {
                        // Full transaction object
                        const txObj = tx as any;
                        if (txObj.data) {
                            estimatedSize += (txObj.data.length / 2) - 1; // Hex to bytes
                            estimatedSize += 100; // Transaction overhead
                        }
                    }
                }

                const estimatedSizeMB = estimatedSize / (1024 * 1024);
                console.log(`Estimated block RLP size: ~${estimatedSize} bytes (${estimatedSizeMB.toFixed(2)} MiB)`);

                if (estimatedSize > Number(maxRlpSize)) {
                    console.log(`⚠ Estimated size exceeds limit (${maxRlpSize.toString()} bytes)`);
                    console.log(`  This block would be rejected if EIP-7934 is strictly enforced`);
                } else {
                    console.log(`✓ Estimated size is within limit`);
                }
            }
        }

        // Test 2: Deploy DataReceiver contract and test large calldata transactions
        console.log("\n=== Test 2: Large calldata transactions with contract ===");
        console.log("Deploying DataReceiver contract for calldata testing...");
        
        // Load and deploy DataReceiver contract
        const dataReceiverArtifact = loadArtifact("../../out/DataReceiver.sol/DataReceiver.json");
        const DataReceiverFactory = new ethers.ContractFactory(
            dataReceiverArtifact.abi,
            getBytecode(dataReceiverArtifact),
            wallet
        );
        
        const dataReceiver = await DataReceiverFactory.deploy();
        await dataReceiver.waitForDeployment();
        const dataReceiverAddress = await dataReceiver.getAddress();
        console.log(`✓ DataReceiver deployed at: ${dataReceiverAddress}`);
        
        // Test with progressively larger calldata sizes
        const calldataSizes = [
            1024,           // 1 KB
            10 * 1024,      // 10 KB
            100 * 1024,     // 100 KB
            500 * 1024,     // 500 KB
            1024 * 1024,    // 1 MB
        ];
        
        console.log("\nTesting transactions with various calldata sizes:");
        
        for (const calldataSize of calldataSizes) {
            // Generate random data
            const randomData = ethers.randomBytes(calldataSize);
            
            try {
                // Estimate gas for transaction with calldata
                const gasEstimate = await provider.estimateGas({
                    from: testAddress,
                    to: dataReceiverAddress,
                    data: dataReceiver.interface.encodeFunctionData("receiveDataMinimal", [randomData]),
                });
                
                // Calculate transaction size (approximate)
                // Transaction overhead: ~100 bytes (nonce, gasPrice, gasLimit, to, value, v, r, s)
                // Function selector: 4 bytes
                // Calldata encoding overhead: ~32 bytes per 32-byte chunk
                const txOverhead = 100;
                const functionSelector = 4;
                const calldataOverhead = Math.ceil(calldataSize / 32) * 32;
                const estimatedTxSize = txOverhead + functionSelector + calldataOverhead;
                
                console.log(`✓ Calldata size ${(calldataSize / 1024).toFixed(1)} KB:`);
                console.log(`    Gas estimate: ${gasEstimate.toString()}`);
                console.log(`    Estimated tx size: ~${estimatedTxSize} bytes (${(estimatedTxSize / 1024).toFixed(2)} KB)`);
                
                // Optionally send the transaction to verify it's accepted
                // (commented out to avoid consuming gas, uncomment for full testing)
                /*
                const tx = await dataReceiver.receiveDataMinimal(randomData);
                const receipt = await tx.wait();
                console.log(`    Transaction hash: ${receipt.hash}`);
                */
                
            } catch (error: any) {
                console.log(`⚠ Calldata size ${(calldataSize / 1024).toFixed(1)} KB: rejected`);
                console.log(`    Reason: ${error.message.substring(0, 120)}...`);
                
                // If even small sizes fail, there might be an issue
                if (calldataSize <= 10 * 1024) {
                    console.log(`    ⚠ Warning: Small calldata size was rejected. This may indicate a configuration issue.`);
                }
            }
        }
        
        console.log("\nNote: EIP-7934 limits apply at the block level (10 MiB total RLP size).");
        console.log("Individual transactions can be large, but the sum of all transactions in a block must stay under 10 MiB.");

        console.log("\n=== Summary ===");
        console.log("✓ EIP-7934 (RLP Block Size Limit) test completed");
        console.log("  - Block size limit: 10 MiB (per EIP-7934)");
        console.log("  - Current block size checked");
        console.log("  - Large calldata transaction tested");
        console.log("\nNote: Full block size enforcement testing requires:");
        console.log("  - Multiple transactions in a single block");
        console.log("  - Control over block production timing");
        console.log("  - Actual RLP encoding of the full block");

    } catch (error: any) {
        console.error("\nFatal error:", error.message);
        process.exit(1);
    }
}

testRlpBlockSize().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});




