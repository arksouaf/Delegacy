// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {SessionGuardFactory} from "../src/core/SessionGuardFactory.sol";
import {SessionKeyValidator} from "../src/validators/SessionKeyValidator.sol";
import {SpendingLimitPolicy} from "../src/policies/SpendingLimitPolicy.sol";
import {AllowlistPolicy} from "../src/policies/AllowlistPolicy.sol";
import {RateLimitPolicy} from "../src/policies/RateLimitPolicy.sol";
import {GasLimitPolicy} from "../src/policies/GasLimitPolicy.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("SESSIONGUARD_PRIVATE_KEY");
        address entryPoint = vm.envOr("ENTRY_POINT", address(0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789));

        vm.startBroadcast(deployerKey);

        // 1. Deploy factory (also deploys the account implementation)
        SessionGuardFactory factory = new SessionGuardFactory(entryPoint);
        console.log("SessionGuardFactory:", address(factory));
        console.log("Account Implementation:", factory.accountImplementation());

        // 2. Deploy session key validator
        SessionKeyValidator validator = new SessionKeyValidator();
        console.log("SessionKeyValidator:", address(validator));

        // 3. Deploy policies
        SpendingLimitPolicy spendPolicy = new SpendingLimitPolicy();
        console.log("SpendingLimitPolicy:", address(spendPolicy));

        AllowlistPolicy allowlistPolicy = new AllowlistPolicy();
        console.log("AllowlistPolicy:", address(allowlistPolicy));

        RateLimitPolicy ratePolicy = new RateLimitPolicy();
        console.log("RateLimitPolicy:", address(ratePolicy));

        GasLimitPolicy gasPolicy = new GasLimitPolicy();
        console.log("GasLimitPolicy:", address(gasPolicy));

        vm.stopBroadcast();
    }
}
