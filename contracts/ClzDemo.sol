// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title ClzDemo
 * @notice Demonstrates the CLZ (Count Leading Zeros) opcode (EIP-7939)
 * @dev CLZ opcode (0x5c) counts leading zero bits in a 256-bit value
 *      Returns 256 for input 0
 */
contract ClzDemo {
    /**
     * @notice Count leading zeros in a 256-bit value using CLZ opcode
     * @param value The input value
     * @return count The number of leading zero bits (0-256)
     */
    function countLeadingZeros(uint256 value) public pure returns (uint256 count) {
        assembly {
            count := clz(value)
        }
    }

    /**
     * @notice Count leading zeros for multiple values
     * @param values Array of input values
     * @return counts Array of leading zero counts
     */
    function clzBatch(uint256[] memory values) public pure returns (uint256[] memory counts) {
        counts = new uint256[](values.length);
        for (uint256 i = 0; i < values.length; i++) {
            assembly {
                let idx := mul(i, 0x20)
                let val := mload(add(values, add(0x20, idx)))
                let result := clz(val)
                mstore(add(counts, add(0x20, idx)), result)
            }
        }
    }

    /**
     * @notice Get CLZ result and verify it's within valid range [0, 256]
     * @param value The input value
     * @return count The number of leading zero bits
     * @return isValid True if count is in valid range
     */
    function clzWithValidation(uint256 value) public pure returns (uint256 count, bool isValid) {
        assembly {
            count := clz(value)
        }
        isValid = count <= 256;
    }
}




