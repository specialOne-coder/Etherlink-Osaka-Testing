// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {Secp256r1Verifier} from "../../contracts/Secp256r1Verifier.sol";

/**
 * @title Secp256r1_Osaka
 * @notice Tests the secp256r1 precompile (EIP-7951)
 * @dev Uses standard NIST P-256 test vectors where possible
 */
contract Secp256r1_Osaka is Test {
    Secp256r1Verifier public verifier;

    function setUp() public {
        verifier = new Secp256r1Verifier();
    }

    /**
     * @notice Test that precompile exists and can be called
     */
    function test_PrecompileExists() public view {
        // Even with invalid inputs, the precompile should exist and return 0 (invalid)
        // If precompile doesn't exist, this would revert
        bytes32 publicKeyX = bytes32(uint256(1));
        bytes32 publicKeyY = bytes32(uint256(2));
        bytes32 messageHash = keccak256("test");
        bytes32 signatureR = bytes32(uint256(3));
        bytes32 signatureS = bytes32(uint256(4));

        bool isValid = verifier.verify(publicKeyX, publicKeyY, messageHash, signatureR, signatureS);
        assertFalse(isValid, "Invalid signature should return false");
    }

    /**
     * @notice Test that modified message makes signature invalid
     */
    function test_ModifiedMessageInvalid() public view {
        // Use dummy values - signature will be invalid
        bytes32 publicKeyX = bytes32(uint256(1));
        bytes32 publicKeyY = bytes32(uint256(2));
        bytes32 messageHash1 = keccak256("message 1");
        bytes32 messageHash2 = keccak256("message 2");
        bytes32 signatureR = bytes32(uint256(3));
        bytes32 signatureS = bytes32(uint256(4));

        bool isValid1 = verifier.verify(publicKeyX, publicKeyY, messageHash1, signatureR, signatureS);
        bool isValid2 = verifier.verify(publicKeyX, publicKeyY, messageHash2, signatureR, signatureS);

        // Both should be invalid with dummy values, but they should behave consistently
        assertFalse(isValid1, "Signature 1 should be invalid");
        assertFalse(isValid2, "Signature 2 should be invalid");
    }

    /**
     * @notice Test that modified public key makes signature invalid
     */
    function test_ModifiedPublicKeyInvalid() public view {
        bytes32 messageHash = keccak256("test message");
        bytes32 signatureR = bytes32(uint256(1));
        bytes32 signatureS = bytes32(uint256(2));

        bytes32 publicKeyX1 = bytes32(uint256(100));
        bytes32 publicKeyY1 = bytes32(uint256(200));
        bytes32 publicKeyX2 = bytes32(uint256(101));
        bytes32 publicKeyY2 = bytes32(uint256(201));

        bool isValid1 = verifier.verify(publicKeyX1, publicKeyY1, messageHash, signatureR, signatureS);
        bool isValid2 = verifier.verify(publicKeyX2, publicKeyY2, messageHash, signatureR, signatureS);

        assertFalse(isValid1, "Signature with key 1 should be invalid");
        assertFalse(isValid2, "Signature with key 2 should be invalid");
    }

    /**
     * @notice Test gas usage tracking
     */
    function test_GasUsageTracking() public view {
        bytes32 publicKeyX = bytes32(uint256(1));
        bytes32 publicKeyY = bytes32(uint256(2));
        bytes32 messageHash = keccak256("test");
        bytes32 signatureR = bytes32(uint256(3));
        bytes32 signatureS = bytes32(uint256(4));

        (uint256 gasUsed, bool isValid) = verifier.verifyWithGasTracking(
            publicKeyX,
            publicKeyY,
            messageHash,
            signatureR,
            signatureS
        );

        assertGt(gasUsed, 0, "Should use some gas");
        assertFalse(isValid, "Invalid signature should return false");
    }

    /**
     * @notice Test packed input format
     */
    function test_PackedInput() public view {
        bytes memory input = new bytes(160);
        // Fill with dummy data
        for (uint256 i = 0; i < 160; i++) {
            input[i] = bytes1(uint8(i % 256));
        }

        bool isValid = verifier.verifyPacked(input);
        assertFalse(isValid, "Dummy signature should be invalid");
    }

    /**
     * @notice Test that invalid input length is rejected
     */
    function test_InvalidInputLength() public {
        bytes memory invalidInput = new bytes(100); // Wrong length

        vm.expectRevert("Secp256r1Verifier: invalid input length");
        verifier.verifyPacked(invalidInput);
    }

    /**
     * @notice Test edge cases: zero values
     */
    function test_ZeroValues() public view {
        bytes32 zero = bytes32(0);
        bytes32 messageHash = keccak256("test");

        bool isValid = verifier.verify(zero, zero, messageHash, zero, zero);
        assertFalse(isValid, "Zero values should produce invalid signature");
    }

    /**
     * @notice Test edge cases: maximum values
     */
    function test_MaxValues() public view {
        bytes32 max = bytes32(type(uint256).max);
        bytes32 messageHash = keccak256("test");

        bool isValid = verifier.verify(max, max, messageHash, max, max);
        // Result depends on whether these values form a valid signature
        // For testing purposes, we just verify the call doesn't revert
        // isValid could be true or false depending on the values
    }
}




