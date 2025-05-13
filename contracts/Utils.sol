pragma solidity ^0.8.28;

contract Utils {
    function upDiv(uint256 a, uint256 b) internal pure returns (uint256) {
        uint256 q = a / b;
        return a % b == 0 ? q : q + 1;
    }
}