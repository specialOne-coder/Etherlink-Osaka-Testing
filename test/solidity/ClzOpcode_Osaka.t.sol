// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {ClzDemo} from "../../contracts/ClzDemo.sol";

/**
 * @title ClzOpcode_Osaka
 * @notice Tests the CLZ (Count Leading Zeros) opcode (EIP-7939)
 */
contract ClzOpcode_Osaka is Test {
    ClzDemo public clzDemo;

    function setUp() public {
        clzDemo = new ClzDemo();
    }

    /**
     * @notice Test CLZ with zero input (should return 256)
     */
    function test_ClzZero() public view {
        uint256 result = clzDemo.countLeadingZeros(0);
        assertEq(result, 256, "CLZ(0) should return 256");
    }

    /**
     * @notice Test CLZ with one (should return 255)
     */
    function test_ClzOne() public view {
        uint256 result = clzDemo.countLeadingZeros(1);
        assertEq(result, 255, "CLZ(1) should return 255");
    }

    /**
     * @notice Test CLZ with maximum value (should return 0)
     */
    function test_ClzMax() public view {
        uint256 result = clzDemo.countLeadingZeros(type(uint256).max);
        assertEq(result, 0, "CLZ(max) should return 0");
    }

    /**
     * @notice Test CLZ with 2^255 (should return 1)
     */
    function test_ClzPowerOfTwo255() public view {
        uint256 value = 2 ** 255;
        uint256 result = clzDemo.countLeadingZeros(value);
        assertEq(result, 0, "CLZ(2^255) should return 0");
    }

    /**
     * @notice Test CLZ with 2^128 (should return 128)
     */
    function test_ClzPowerOfTwo128() public view {
        uint256 value = 2 ** 128;
        uint256 result = clzDemo.countLeadingZeros(value);
        assertEq(result, 127, "CLZ(2^128) should return 127");
    }

    /**
     * @notice Test CLZ with various powers of two
     */
    function test_ClzPowersOfTwo() public view {
        for (uint256 i = 0; i < 256; i++) {
            uint256 value = 2 ** i;
            uint256 expected = 256 - i - 1;
            uint256 result = clzDemo.countLeadingZeros(value);
            assertEq(result, expected, string(abi.encodePacked("CLZ(2^", vm.toString(i), ") should return ", vm.toString(expected))));
        }
    }

    /**
     * @notice Test CLZ with random values
     */
    function test_ClzRandomValues() public view {
        // Test some specific known values
        assertEq(clzDemo.countLeadingZeros(256), 247, "CLZ(256) = 247");
        assertEq(clzDemo.countLeadingZeros(255), 248, "CLZ(255) = 248");
        assertEq(clzDemo.countLeadingZeros(0x8000000000000000000000000000000000000000000000000000000000000000), 0, "CLZ(0x80...00) = 0");
        assertEq(clzDemo.countLeadingZeros(0x4000000000000000000000000000000000000000000000000000000000000000), 1, "CLZ(0x40...00) = 1");
    }

    /**
     * @notice Test CLZ gas usage consistency
     */
    function test_ClzGasUsage() public view {
        // Warm up the contract/code access
        clzDemo.countLeadingZeros(123);

        uint256 gas1 = gasleft();
        clzDemo.countLeadingZeros(0);
        uint256 gasUsed1 = gas1 - gasleft();

        uint256 gas2 = gasleft();
        clzDemo.countLeadingZeros(type(uint256).max);
        uint256 gasUsed2 = gas2 - gasleft();

        // Gas usage should be similar (CLZ opcode cost is constant)
        // Allow some variance for other operations
        assertApproxEqAbs(gasUsed1, gasUsed2, 10, "CLZ gas usage should be consistent");
    }

    /**
     * @notice Test CLZ validation function
     */
    function test_ClzValidation() public view {
        (uint256 count, bool isValid) = clzDemo.clzWithValidation(0);
        assertTrue(isValid, "CLZ(0) should be valid");
        assertEq(count, 256, "CLZ(0) should return 256");

        (count, isValid) = clzDemo.clzWithValidation(type(uint256).max);
        assertTrue(isValid, "CLZ(max) should be valid");
        assertEq(count, 0, "CLZ(max) should return 0");
    }

    /**
     * @notice Fuzz test CLZ with random inputs
     */
    function testFuzz_Clz(uint256 value) public view {
        uint256 result = clzDemo.countLeadingZeros(value);
        
        // Result should always be in range [0, 256]
        assertGe(result, 0, "CLZ result should be >= 0");
        assertLe(result, 256, "CLZ result should be <= 256");
        
        // If value is 0, result must be 256
        if (value == 0) {
            assertEq(result, 256, "CLZ(0) must return 256");
        } else {
            // If value is non-zero, result must be < 256
            assertLt(result, 256, "CLZ(non-zero) must return < 256");
        }
    }
}




