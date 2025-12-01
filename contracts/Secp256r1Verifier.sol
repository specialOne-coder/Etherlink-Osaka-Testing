// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title Secp256r1Verifier
 * @notice Thin wrapper around the secp256r1 precompile (EIP-7951)
 * @dev Precompile address: 0x100
 *      Input: 64-byte public key (32-byte x, 32-byte y) + 32-byte message hash + 64-byte signature (32-byte r, 32-byte s)
 *      Output: 1 for valid signature, 0 for invalid
 */
contract Secp256r1Verifier {
    /// @notice Address of the secp256r1 precompile (EIP-7951)
    address public constant SECP256R1_PRECOMPILE = address(0x100);

    /**
     * @notice Verify a secp256r1 signature
     * @param publicKeyX Public key x-coordinate (32 bytes)
     * @param publicKeyY Public key y-coordinate (32 bytes)
     * @param messageHash Message hash (32 bytes)
     * @param signatureR Signature r component (32 bytes)
     * @param signatureS Signature s component (32 bytes)
     * @return isValid True if signature is valid, false otherwise
     */
    function verify(
        bytes32 publicKeyX,
        bytes32 publicKeyY,
        bytes32 messageHash,
        bytes32 signatureR,
        bytes32 signatureS
    ) public view returns (bool isValid) {
        // Prepare input: 64-byte public key + 32-byte message + 64-byte signature = 160 bytes
        bytes memory input = abi.encodePacked(publicKeyX, publicKeyY, messageHash, signatureR, signatureS);

        // Call precompile
        (bool success, bytes memory output) = SECP256R1_PRECOMPILE.staticcall(input);
        
        // Precompile returns 1 for valid, 0 for invalid
        // If call fails, signature is invalid
        if (!success || output.length == 0) {
            return false;
        }

        // Check if first byte is 1 (valid) or 0 (invalid)
        isValid = output[0] == 0x01;
    }

    /**
     * @notice Verify a secp256r1 signature with packed input
     * @param input Packed input: 64-byte public key + 32-byte message + 64-byte signature
     * @return isValid True if signature is valid, false otherwise
     */
    function verifyPacked(bytes calldata input) public view returns (bool isValid) {
        require(input.length == 160, "Secp256r1Verifier: invalid input length");
        
        (bool success, bytes memory output) = SECP256R1_PRECOMPILE.staticcall(input);
        
        if (!success || output.length == 0) {
            return false;
        }

        isValid = output[0] == 0x01;
    }

    /**
     * @notice Get gas used for a verification call
     * @param publicKeyX Public key x-coordinate
     * @param publicKeyY Public key y-coordinate
     * @param messageHash Message hash
     * @param signatureR Signature r component
     * @param signatureS Signature s component
     * @return gasUsed Gas used for the verification
     * @return isValid Whether the signature is valid
     */
    function verifyWithGasTracking(
        bytes32 publicKeyX,
        bytes32 publicKeyY,
        bytes32 messageHash,
        bytes32 signatureR,
        bytes32 signatureS
    ) public view returns (uint256 gasUsed, bool isValid) {
        uint256 gasBefore = gasleft();
        isValid = verify(publicKeyX, publicKeyY, messageHash, signatureR, signatureS);
        gasUsed = gasBefore - gasleft();
    }
}




