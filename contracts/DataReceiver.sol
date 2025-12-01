// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title DataReceiver
 * @notice Simple contract that accepts arbitrary calldata for testing EIP-7934 block size limits
 * @dev This contract is used to test large calldata transactions without rejection
 */
contract DataReceiver {
    event DataReceived(bytes data, uint256 size);

    /**
     * @notice Accepts arbitrary calldata and emits an event
     * @param data The calldata to process
     */
    function receiveData(bytes calldata data) external {
        emit DataReceived(data, data.length);
    }

    /**
     * @notice Accepts arbitrary calldata and returns its length
     * @param data The calldata to process
     * @return length The length of the received data
     */
    function receiveDataAndReturnLength(bytes calldata data) external pure returns (uint256 length) {
        return data.length;
    }

    /**
     * @notice Accepts arbitrary calldata without any processing (minimal gas)
     * @param data The calldata to accept
     */
    function receiveDataMinimal(bytes calldata data) external {
        // Do nothing, just accept the data
        // This minimizes gas usage for testing block size limits
    }
}

