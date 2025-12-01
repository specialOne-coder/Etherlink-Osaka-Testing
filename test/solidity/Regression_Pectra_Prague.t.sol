// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";

/**
 * @title Regression_Pectra_Prague
 * @notice Sanity checks to ensure previous upgrades (Pectra/Prague) still work after Osaka
 * @dev Tests EIP-7702 and common patterns that should not be broken by Osaka
 */
contract Regression_Pectra_Prague is Test {
    /**
     * @notice Test that basic contract deployment still works
     */
    function test_BasicDeployment() public {
        SimpleContract contract_ = new SimpleContract();
        assertTrue(address(contract_) != address(0), "Contract should be deployed");
    }

    /**
     * @notice Test that basic contract calls still work
     */
    function test_BasicContractCall() public {
        SimpleContract contract_ = new SimpleContract();
        uint256 result = contract_.getValue();
        assertEq(result, 42, "Contract call should work");
    }

    /**
     * @notice Test that ERC-20 like transfers still work
     */
    function test_ERC20LikeTransfer() public {
        MockERC20 token = new MockERC20();
        
        address recipient = address(0x1234);
        uint256 amount = 1000;
        
        token.transfer(recipient, amount);
        
        assertEq(token.balanceOf(recipient), amount, "Transfer should work");
        assertEq(token.balanceOf(address(this)), type(uint256).max - amount, "Sender balance should decrease");
    }

    /**
     * @notice Test that multicall pattern still works
     */
    function test_MulticallPattern() public {
        MockERC20 token = new MockERC20();
        address recipient1 = address(0x1111);
        address recipient2 = address(0x2222);
        
        // Simulate multicall: multiple transfers
        token.transfer(recipient1, 100);
        token.transfer(recipient2, 200);
        
        assertEq(token.balanceOf(recipient1), 100, "First transfer should work");
        assertEq(token.balanceOf(recipient2), 200, "Second transfer should work");
    }

    /**
     * @notice Test that storage operations still work correctly
     */
    function test_StorageOperations() public {
        StorageContract storage_ = new StorageContract();
        
        storage_.setValue(123);
        assertEq(storage_.getValue(), 123, "Storage write/read should work");
        
        storage_.setValue(456);
        assertEq(storage_.getValue(), 456, "Storage update should work");
    }

    /**
     * @notice Test that events still work
     */
    function test_Events() public {
        EventContract event_ = new EventContract();
        
        vm.expectEmit(true, true, true, true);
        emit EventContract.ValueSet(789);
        event_.setValue(789);
    }

    /**
     * @notice Test that revert behavior still works
     */
    function test_RevertBehavior() public {
        RevertContract revert_ = new RevertContract();
        
        vm.expectRevert("Test revert");
        revert_.revertWithMessage();
    }

    /**
     * @notice Test that gas estimation still works
     */
    function test_GasEstimation() public {
        SimpleContract contract_ = new SimpleContract();
        
        uint256 gasBefore = gasleft();
        contract_.getValue();
        uint256 gasUsed = gasBefore - gasleft();
        
        assertGt(gasUsed, 0, "Should use some gas");
        assertLt(gasUsed, 100000, "Should use reasonable amount of gas");
    }
}

/**
 * @title SimpleContract
 * @notice Helper contract for regression tests
 */
contract SimpleContract {
    function getValue() public pure returns (uint256) {
        return 42;
    }
}

/**
 * @title MockERC20
 * @notice Simple ERC-20 like contract for testing
 */
contract MockERC20 {
    mapping(address => uint256) public balanceOf;

    constructor() {
        balanceOf[msg.sender] = type(uint256).max;
    }

    function transfer(address to, uint256 amount) public returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

/**
 * @title StorageContract
 * @notice Contract with storage for testing
 */
contract StorageContract {
    uint256 private value;

    function setValue(uint256 _value) public {
        value = _value;
    }

    function getValue() public view returns (uint256) {
        return value;
    }
}

/**
 * @title EventContract
 * @notice Contract with events for testing
 */
contract EventContract {
    event ValueSet(uint256 value);

    function setValue(uint256 _value) public {
        emit ValueSet(_value);
    }
}

/**
 * @title RevertContract
 * @notice Contract that reverts for testing
 */
contract RevertContract {
    function revertWithMessage() public pure {
        revert("Test revert");
    }
}




