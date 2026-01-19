// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MNEEToken is ERC20 {
    constructor() ERC20("MNEE Stablecoin", "MNEE") {
        _mint(msg.sender, 1_000_000 * 10 ** decimals());
    }
}
