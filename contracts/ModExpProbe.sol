// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title ModExpProbe
 * @notice Helper contract to exercise the ModExp precompile with different input sizes
 * @dev Tests EIP-7823 (upper bounds) and EIP-7883 (gas cost changes)
 *      ModExp precompile address: 0x05
 */
contract ModExpProbe {
    /// @notice Address of the ModExp precompile
    address public constant MODEXP_PRECOMPILE = address(0x05);

    /**
     * @notice Call ModExp precompile with specified base, exponent, and modulus
     * @param base Base value
     * @param exponent Exponent value
     * @param modulus Modulus value
     * @return result The result of (base^exponent) mod modulus
     * @return success Whether the call succeeded
     */
    function modExp(
        bytes memory base,
        bytes memory exponent,
        bytes memory modulus
    ) public view returns (bytes memory result, bool success) {
        // ModExp input format: base_length (32 bytes) || exponent_length (32 bytes) || modulus_length (32 bytes) || base || exponent || modulus
        uint256 baseLen = base.length;
        uint256 expLen = exponent.length;
        uint256 modLen = modulus.length;

        bytes memory input = abi.encodePacked(
            uint256(baseLen),
            uint256(expLen),
            uint256(modLen),
            base,
            exponent,
            modulus
        );

        (success, result) = MODEXP_PRECOMPILE.staticcall(input);
    }

    /**
     * @notice Call ModExp and track gas usage
     * @param base Base value
     * @param exponent Exponent value
     * @param modulus Modulus value
     * @return result The result of (base^exponent) mod modulus
     * @return gasUsed Gas used for the operation
     * @return success Whether the call succeeded
     */
    function modExpWithGasTracking(
        bytes memory base,
        bytes memory exponent,
        bytes memory modulus
    ) public view returns (bytes memory result, uint256 gasUsed, bool success) {
        uint256 gasBefore = gasleft();
        (result, success) = modExp(base, exponent, modulus);
        gasUsed = gasBefore - gasleft();
    }

    /**
     * @notice Test ModExp with various input sizes to probe bounds
     * @param baseSize Size of base in bytes
     * @param exponentSize Size of exponent in bytes
     * @param modulusSize Size of modulus in bytes
     * @return success Whether the call succeeded
     * @return gasUsed Gas used for the operation
     */
    function probeBounds(
        uint256 baseSize,
        uint256 exponentSize,
        uint256 modulusSize
    ) public view returns (bool success, uint256 gasUsed) {
        // Create dummy inputs of specified sizes
        bytes memory base = new bytes(baseSize);
        bytes memory exponent = new bytes(exponentSize);
        bytes memory modulus = new bytes(modulusSize);

        // Fill with non-zero values to avoid edge cases
        for (uint256 i = 0; i < baseSize; i++) {
            base[i] = bytes1(uint8((i % 255) + 1));
        }
        for (uint256 i = 0; i < exponentSize; i++) {
            exponent[i] = bytes1(uint8((i % 255) + 1));
        }
        for (uint256 i = 0; i < modulusSize; i++) {
            modulus[i] = bytes1(uint8((i % 255) + 1));
        }

        uint256 gasBefore = gasleft();
        (, success) = modExp(base, exponent, modulus);
        gasUsed = gasBefore - gasleft();
    }

    /**
     * @notice Test ModExp with specific values
     * @param base Base value as bytes
     * @param exponent Exponent value as bytes
     * @param modulus Modulus value as bytes
     * @return result The result
     * @return gasUsed Gas used
     * @return success Whether succeeded
     */
    function testModExp(
        bytes calldata base,
        bytes calldata exponent,
        bytes calldata modulus
    ) public view returns (bytes memory result, uint256 gasUsed, bool success) {
        uint256 gasBefore = gasleft();
        (result, success) = modExp(base, exponent, modulus);
        gasUsed = gasBefore - gasleft();
    }
}




