// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, ebool, euint64, euint128} from "@fhevm/solidity/lib/FHE.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuardTransient} from "@openzeppelin/contracts/utils/ReentrancyGuardTransient.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {IERC7984} from "@openzeppelin/confidential-contracts/interfaces/IERC7984.sol";

/**
 * @title VestingWalletExample
 * @dev A simple example demonstrating how to create a vesting wallet for ERC7984 tokens
 * 
 * This contract shows how to create a vesting wallet that receives ERC7984 tokens
 * and releases them to the beneficiary according to a confidential, linear vesting schedule.
 * 
 * This is a non-upgradeable version for demonstration purposes.
 */
contract VestingWalletExample is Ownable, ReentrancyGuardTransient, ZamaEthereumConfig {
    mapping(address token => euint128) private _tokenReleased;
    uint64 private _start;
    uint64 private _duration;

    /// @dev Emitted when releasable vested tokens are released.
    event VestingWalletConfidentialTokenReleased(address indexed token, euint64 amount);

    constructor(
        address beneficiary,
        uint48 startTimestamp,
        uint48 durationSeconds
    ) Ownable(beneficiary) {
        _start = startTimestamp;
        _duration = durationSeconds;
    }

    /// @dev Timestamp at which the vesting starts.
    function start() public view virtual returns (uint64) {
        return _start;
    }

    /// @dev Duration of the vesting in seconds.
    function duration() public view virtual returns (uint64) {
        return _duration;
    }

    /// @dev Timestamp at which the vesting ends.
    function end() public view virtual returns (uint64) {
        return start() + duration();
    }

    /// @dev Amount of token already released
    function released(address token) public view virtual returns (euint128) {
        return _tokenReleased[token];
    }

    /**
     * @dev Getter for the amount of releasable `token` tokens. `token` should be the address of an
     * {IERC7984} contract.
     */
    function releasable(address token) public virtual returns (euint64) {
        euint128 vestedAmount_ = vestedAmount(token, uint48(block.timestamp));
        euint128 releasedAmount = released(token);
        ebool success = FHE.ge(vestedAmount_, releasedAmount);
        return FHE.select(success, FHE.asEuint64(FHE.sub(vestedAmount_, releasedAmount)), FHE.asEuint64(0));
    }

    /**
     * @dev Release the tokens that have already vested.
     *
     * Emits a {VestingWalletConfidentialTokenReleased} event.
     */
    function release(address token) public virtual nonReentrant {
        euint64 amount = releasable(token);
        FHE.allowTransient(amount, token);
        euint64 amountSent = IERC7984(token).confidentialTransfer(owner(), amount);

        // This could overflow if the total supply is resent `type(uint128).max/type(uint64).max` times. This is an accepted risk.
        euint128 newReleasedAmount = FHE.add(released(token), amountSent);
        FHE.allow(newReleasedAmount, owner());
        FHE.allowThis(newReleasedAmount);
        _tokenReleased[token] = newReleasedAmount;
        emit VestingWalletConfidentialTokenReleased(token, amountSent);
    }

    /**
     * @dev Calculates the amount of tokens that have been vested at the given timestamp.
     * Default implementation is a linear vesting curve.
     */
    function vestedAmount(address token, uint48 timestamp) public virtual returns (euint128) {
        return _vestingSchedule(FHE.add(released(token), IERC7984(token).confidentialBalanceOf(address(this))), timestamp);
    }

    /// @dev This returns the amount vested, as a function of time, for an asset given its total historical allocation.
    function _vestingSchedule(euint128 totalAllocation, uint48 timestamp) internal virtual returns (euint128) {
        if (timestamp < start()) {
            return euint128.wrap(0);
        } else if (timestamp >= end()) {
            return totalAllocation;
        } else {
            return FHE.div(FHE.mul(totalAllocation, (timestamp - start())), duration());
        }
    }
}

