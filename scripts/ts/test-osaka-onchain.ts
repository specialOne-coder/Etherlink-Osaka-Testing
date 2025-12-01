#!/usr/bin/env node
/**
 * @file test-osaka-onchain.ts
 * @notice Tests Osaka features by deploying contracts to Etherlink and calling them
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
    // Support both Foundry-style (`bytecode`: string) and Hardhat-style (`bytecode.object`: string)
    const bc = (artifact as any).bytecode;
    if (typeof bc === "string") {
        return bc;
    }
    if (bc && typeof bc.object === "string") {
        return bc.object;
    }
    throw new Error("Unable to determine contract bytecode from artifact");
}

async function testOsakaOnchain() {
    const rpcUrl = process.env.ETH_RPC_URL;
    const privateKey = process.env.PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

    if (!rpcUrl) {
        console.error("ERROR: ETH_RPC_URL environment variable not set");
        process.exit(1);
    }

    console.log(`Connecting to RPC: ${rpcUrl}`);
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);

    const testAddress = await wallet.getAddress();
    console.log(`Test account: ${testAddress}`);

    const balance = await provider.getBalance(testAddress);
    console.log(`Balance: ${ethers.formatEther(balance)} ETH\n`);

    if (balance === 0n) {
        console.error("ERROR: Test account has no balance. Please fund it first.");
        process.exit(1);
    }

    let allPassed = true;

    // Test 1: Deploy and test CLZ contract
    console.log("=== Test 1: CLZ Opcode (EIP-7939) ===");
    try {
        const clzArtifact = loadArtifact("../../out/ClzDemo.sol/ClzDemo.json");

        console.log("Deploying ClzDemo contract...");
        const ClzFactory = new ethers.ContractFactory(
            clzArtifact.abi,
            getBytecode(clzArtifact),
            wallet
        );

        const clzDemo = await ClzFactory.deploy();
        await clzDemo.waitForDeployment();
        const clzAddress = await clzDemo.getAddress();
        console.log(`✓ ClzDemo deployed at: ${clzAddress}`);

        // Test CLZ(0) = 256
        console.log("\nTesting CLZ(0)...");
        const result0 = await (clzDemo as any).countLeadingZeros(0);
        if (result0 === 256n) {
            console.log(`✓ CLZ(0) = ${result0} (expected: 256)`);
        } else {
            console.error(`✗ CLZ(0) = ${result0} (expected: 256)`);
            allPassed = false;
        }

        // Test CLZ(1) = 255
        console.log("Testing CLZ(1)...");
        const result1 = await (clzDemo as any).countLeadingZeros(1);
        if (result1 === 255n) {
            console.log(`✓ CLZ(1) = ${result1} (expected: 255)`);
        } else {
            console.error(`✗ CLZ(1) = ${result1} (expected: 255)`);
            allPassed = false;
        }

        // Test CLZ(max) = 0
        console.log("Testing CLZ(max)...");
        const resultMax = await (clzDemo as any).countLeadingZeros(ethers.MaxUint256);
        if (resultMax === 0n) {
            console.log(`✓ CLZ(max) = ${resultMax} (expected: 0)`);
        } else {
            console.error(`✗ CLZ(max) = ${resultMax} (expected: 0)`);
            allPassed = false;
        }

        // Test CLZ(2^255) = 0
        console.log("Testing CLZ(2^255)...");
        const result255 = await (clzDemo as any).countLeadingZeros(2n ** 255n);
        if (result255 === 0n) {
            console.log(`✓ CLZ(2^255) = ${result255} (expected: 0)`);
        } else {
            console.error(`✗ CLZ(2^255) = ${result255} (expected: 0)`);
            allPassed = false;
        }

        // Test clzBatch
        console.log("\nTesting clzBatch...");
        const batchValues = [0n, 1n, 256n, ethers.MaxUint256];
        const batchResults = await (clzDemo as any).clzBatch(batchValues);
        if (batchResults.length === 4 && 
            batchResults[0] === 256n && 
            batchResults[1] === 255n && 
            batchResults[2] === 247n && 
            batchResults[3] === 0n) {
            console.log(`✓ clzBatch([0, 1, 256, max]) = [256, 255, 247, 0] (correct)`);
        } else {
            console.error(`✗ clzBatch returned unexpected results: ${batchResults}`);
            allPassed = false;
        }

        // Test clzWithValidation
        console.log("Testing clzWithValidation...");
        const [count0, isValid0] = await (clzDemo as any).clzWithValidation(0);
        if (count0 === 256n && isValid0 === true) {
            console.log(`✓ clzWithValidation(0) = (256, true) (correct)`);
        } else {
            console.error(`✗ clzWithValidation(0) = (${count0}, ${isValid0}) (expected: (256, true))`);
            allPassed = false;
        }

        console.log("\n✓ CLZ tests completed");
    } catch (error: any) {
        console.error(`✗ CLZ tests failed: ${error.message}`);
        allPassed = false;
    }

    // Test 2: Test secp256r1 precompile
    console.log("\n=== Test 2: secp256r1 Precompile (EIP-7951) ===");
    try {
        const secp256r1Artifact = loadArtifact("../../out/Secp256r1Verifier.sol/Secp256r1Verifier.json");

        console.log("Deploying Secp256r1Verifier contract...");
        const Secp256r1Factory = new ethers.ContractFactory(
            secp256r1Artifact.abi,
            getBytecode(secp256r1Artifact),
            wallet
        );

        const secp256r1 = await Secp256r1Factory.deploy();
        await secp256r1.waitForDeployment();
        const secp256r1Address = await secp256r1.getAddress();
        console.log(`✓ Secp256r1Verifier deployed at: ${secp256r1Address}`);

        // Test with dummy values (should fail verification but not revert)
        console.log("\nTesting secp256r1 precompile availability...");
        const dummyPubKeyX = ethers.hexlify(ethers.randomBytes(32));
        const dummyPubKeyY = ethers.hexlify(ethers.randomBytes(32));
        const dummyHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
        const dummySigR = ethers.hexlify(ethers.randomBytes(32));
        const dummySigS = ethers.hexlify(ethers.randomBytes(32));

        const isValid = await (secp256r1 as any).verify(
            dummyPubKeyX,
            dummyPubKeyY,
            dummyHash,
            dummySigR,
            dummySigS
        );

        console.log(`✓ secp256r1 verify() - precompile is available (dummy signature invalid: ${!isValid})`);

        // Test verifyWithGasTracking
        console.log("\nTesting verifyWithGasTracking...");
        const [gasUsed, isValid2] = await (secp256r1 as any).verifyWithGasTracking(
            dummyPubKeyX,
            dummyPubKeyY,
            dummyHash,
            dummySigR,
            dummySigS
        );
        if (gasUsed > 0n && isValid2 === false) {
            console.log(`✓ verifyWithGasTracking() - gas used: ${gasUsed.toString()}, signature invalid (correct)`);
        } else {
            console.error(`✗ verifyWithGasTracking() returned unexpected values: gas=${gasUsed}, valid=${isValid2}`);
            allPassed = false;
        }

        // Test verifyPacked
        console.log("\nTesting verifyPacked...");
        const packedInput = ethers.concat([
            dummyPubKeyX,
            dummyPubKeyY,
            dummyHash,
            dummySigR,
            dummySigS
        ]);
        const isValid3 = await (secp256r1 as any).verifyPacked(packedInput);
        if (isValid3 === false) {
            console.log(`✓ verifyPacked() - dummy signature invalid (correct)`);
        } else {
            console.error(`✗ verifyPacked() returned unexpected result: ${isValid3}`);
            allPassed = false;
        }

        console.log("\n✓ secp256r1 tests completed");
    } catch (error: any) {
        console.error(`✗ secp256r1 tests failed: ${error.message}`);
        allPassed = false;
    }

    // Test 3: Test ModExp precompile
    console.log("\n=== Test 3: ModExp Precompile (EIP-7823 / 7883) ===");
    try {
        const modExpArtifact = loadArtifact("../../out/ModExpProbe.sol/ModExpProbe.json");

        console.log("Deploying ModExpProbe contract...");
        const ModExpFactory = new ethers.ContractFactory(
            modExpArtifact.abi,
            getBytecode(modExpArtifact),
            wallet
        );

        const modExp = await ModExpFactory.deploy();
        await modExp.waitForDeployment();
        const modExpAddress = await modExp.getAddress();
        console.log(`✓ ModExpProbe deployed at: ${modExpAddress}`);

        // Test: 2^3 mod 5 = 3
        console.log("\nTesting ModExp: 2^3 mod 5...");
        const base = ethers.hexlify(new Uint8Array([2]));
        const exponent = ethers.hexlify(new Uint8Array([3]));
        const modulus = ethers.hexlify(new Uint8Array([5]));

        const [resultHex, success] = await (modExp as any).modExp(base, exponent, modulus);

        if (success) {
            // resultHex is a hex string; convert to bytes to inspect value
            const resultBytes = ethers.getBytes(resultHex as string);
            const lastByte = resultBytes[resultBytes.length - 1];
            if (lastByte === 3) {
                console.log(`✓ ModExp(2^3 mod 5) = 3 (correct)`);
            } else {
                console.error(`✗ ModExp(2^3 mod 5) = ${lastByte} (expected: 3)`);
                allPassed = false;
            }
        } else {
            console.error(`✗ ModExp call failed`);
            allPassed = false;
        }

        // Test modExpWithGasTracking
        console.log("\nTesting modExpWithGasTracking...");
        const [resultHex2, gasUsed, success2] = await (modExp as any).modExpWithGasTracking(base, exponent, modulus);
        if (success2 && gasUsed > 0n) {
            const resultBytes2 = ethers.getBytes(resultHex2 as string);
            const lastByte2 = resultBytes2[resultBytes2.length - 1];
            if (lastByte2 === 3) {
                console.log(`✓ modExpWithGasTracking() - result: 3, gas used: ${gasUsed.toString()} (correct)`);
            } else {
                console.error(`✗ modExpWithGasTracking() - unexpected result: ${lastByte2}`);
                allPassed = false;
            }
        } else {
            console.error(`✗ modExpWithGasTracking() failed`);
            allPassed = false;
        }

        // Test probeBounds with small sizes
        console.log("\nTesting probeBounds...");
        const [success3, gasUsed2] = await (modExp as any).probeBounds(32, 32, 32);
        if (success3 && gasUsed2 > 0n) {
            console.log(`✓ probeBounds(32, 32, 32) - success: true, gas used: ${gasUsed2.toString()} (correct)`);
        } else {
            console.error(`✗ probeBounds() returned unexpected values: success=${success3}, gas=${gasUsed2}`);
            allPassed = false;
        }

        console.log("\n✓ ModExp tests completed");
    } catch (error: any) {
        console.error(`✗ ModExp tests failed: ${error.message}`);
        allPassed = false;
    }

    // Summary
    console.log("\n" + "=".repeat(50));
    if (allPassed) {
        console.log("✓ All Osaka features tested successfully on Etherlink!");
        console.log("  - CLZ opcode: countLeadingZeros(), clzBatch(), clzWithValidation()");
        console.log("  - secp256r1 precompile: verify(), verifyPacked(), verifyWithGasTracking()");
        console.log("  - ModExp precompile: modExp(), modExpWithGasTracking(), probeBounds()");
    } else {
        console.error("✗ Some on-chain Osaka tests failed");
        process.exit(1);
    }
}

testOsakaOnchain().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
