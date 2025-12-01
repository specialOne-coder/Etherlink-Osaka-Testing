// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {ClzDemo} from "../../contracts/ClzDemo.sol";
import {Secp256r1Verifier} from "../../contracts/Secp256r1Verifier.sol";

/**
 * @title ForkActivation_Osaka
 * @notice Tests that Osaka fork features are available after fork activation
 */
contract ForkActivation_Osaka is Test {
    ClzDemo public clzDemo;
    Secp256r1Verifier public secp256r1Verifier;

    function setUp() public {
        clzDemo = new ClzDemo();
        secp256r1Verifier = new Secp256r1Verifier();
    }

    /**
     * @notice Test that CLZ opcode is available (should work if Osaka is active)
     */
    function test_ClzOpcodeAvailable() public view {
        // CLZ should be available after Osaka fork
        // If not available, this will revert with "invalid opcode"
        uint256 result = clzDemo.countLeadingZeros(0);
        assertEq(result, 256, "CLZ(0) should return 256");

        result = clzDemo.countLeadingZeros(1);
        assertEq(result, 255, "CLZ(1) should return 255");

        result = clzDemo.countLeadingZeros(type(uint256).max);
        assertEq(result, 0, "CLZ(max) should return 0");
    }

    /**
     * @notice Test that secp256r1 precompile is available (should work if Osaka is active)
     */
    function test_Secp256r1PrecompileAvailable() public view {
        // secp256r1 precompile should be available after Osaka fork
        // Create dummy inputs (will fail verification but should not revert on precompile call)
        bytes32 publicKeyX = bytes32(uint256(1));
        bytes32 publicKeyY = bytes32(uint256(2));
        bytes32 messageHash = keccak256("test message");
        bytes32 signatureR = bytes32(uint256(3));
        bytes32 signatureS = bytes32(uint256(4));

        // This should not revert - precompile should exist
        // Signature will be invalid, but precompile call should succeed
        bool isValid = secp256r1Verifier.verify(
            publicKeyX,
            publicKeyY,
            messageHash,
            signatureR,
            signatureS
        );
        // We don't care about the result, just that the call didn't revert
        // If precompile doesn't exist, this would revert
        assertFalse(isValid, "Dummy signature should be invalid");
    }

    /**
     * @notice Test CLZ with various edge cases
     */
    function test_ClzEdgeCases() public view {
        assertEq(clzDemo.countLeadingZeros(0), 256, "CLZ(0) = 256");
        assertEq(clzDemo.countLeadingZeros(1), 255, "CLZ(1) = 255");
        assertEq(clzDemo.countLeadingZeros(2), 254, "CLZ(2) = 254");
        assertEq(clzDemo.countLeadingZeros(256), 247, "CLZ(256) = 247");
        assertEq(clzDemo.countLeadingZeros(type(uint256).max), 0, "CLZ(max) = 0");
        assertEq(clzDemo.countLeadingZeros(type(uint256).max >> 1), 1, "CLZ(max>>1) = 1");
    }

    /**
     * @notice Test CLZ batch function
     */
    function test_ClzBatch() public view {
        uint256[] memory values = new uint256[](5);
        values[0] = 0;
        values[1] = 1;
        values[2] = 256;
        values[3] = type(uint256).max;
        values[4] = type(uint256).max >> 1;

        uint256[] memory counts = clzDemo.clzBatch(values);
        assertEq(counts.length, 5, "Batch should return 5 results");
        assertEq(counts[0], 256, "CLZ(0) = 256");
        assertEq(counts[1], 255, "CLZ(1) = 255");
        assertEq(counts[2], 247, "CLZ(256) = 247");
        assertEq(counts[3], 0, "CLZ(max) = 0");
        assertEq(counts[4], 1, "CLZ(max>>1) = 1");
    }
}




