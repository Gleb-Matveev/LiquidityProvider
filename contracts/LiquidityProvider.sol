// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity =0.7.6;
pragma abicoder v2;

import '@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol';
import '@uniswap/v3-core/contracts/libraries/TickMath.sol';
import '@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol';
import '@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol';
import '@uniswap/v3-periphery/contracts/interfaces/INonfungiblePositionManager.sol';
import '@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol';
import '@uniswap/v3-periphery/contracts/base/LiquidityManagement.sol';

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract LiquidityProvider {

    // To Do: подумать над депозитами

    // address posManager как связан с пулом
    INonfungiblePositionManager public positionManager;

    constructor(address npmAddress) {
        positionManager = INonfungiblePositionManager(
            npmAddress
        );
    }
    
    function provideLiquidity(address poolAddr, uint256 amount0ToMint, uint256 amount1ToMint, uint160 width) external {
        (address token0, address token1, uint24 poolFee, uint160 sqrtPriceX96) = getPoolParams(poolAddr);
        (int24 lowerTick, int24 upperTick) = getTicksFromBorders(/*amount0ToMint, amount1ToMint, */width, sqrtPriceX96); // вынести всю логику

        TransferHelper.safeApprove(token0, address(positionManager), amount0ToMint);
        TransferHelper.safeApprove(token1, address(positionManager), amount1ToMint);

        INonfungiblePositionManager.MintParams memory params =
            INonfungiblePositionManager.MintParams({
                token0: token0,
                token1: token1,
                fee: poolFee,
                tickLower: lowerTick, 
                tickUpper: upperTick,
                amount0Desired: amount0ToMint,
                amount1Desired: amount1ToMint,
                amount0Min: 0,
                amount1Min: 0,
                recipient: address(this), //
                deadline: block.timestamp
            });

        (uint256 amount0, uint256 amount1, , ) = positionManager.mint(params);

        if (amount0 < amount0ToMint) {
            TransferHelper.safeApprove(token0, address(positionManager), 0);
            uint256 refund0 = amount0ToMint - amount0;
            TransferHelper.safeTransfer(token0, msg.sender, refund0);
        }

        if (amount1 < amount1ToMint) {
            TransferHelper.safeApprove(token1, address(positionManager), 0);
            uint256 refund1 = amount1ToMint - amount1;
            TransferHelper.safeTransfer(token1, msg.sender, refund1);
        }
    } 

    function getBordersFromAssets(/*uint256 amount0ToMint, uint256 amount1ToMint, */uint160 width, uint160 sqrtPriceX96) internal pure returns (uint160 pa, uint160 pb) {
        // проверка на ноль

        pa = sqrtPriceX96;
        pb = uint160(sqrtPriceX96 * FullMath.mulDiv((10000 + width), 1, (10000 - width))); // проверить 
    }

    function getTicksFromBorders(/*uint256 amount0ToMint, uint256 amount1ToMint, */uint160 width, uint160 sqrtPriceX96) internal pure returns (int24 lowerTick, int24 upperTick) {
        (uint160 pa, uint160 pb) = getBordersFromAssets(/*amount0ToMint, amount1ToMint, */width, sqrtPriceX96);

        lowerTick = TickMath.getTickAtSqrtRatio(pa);
        upperTick = TickMath.getTickAtSqrtRatio(pb);
    }

    function getPoolParams(address poolAddr) internal view returns (address token0, address token1, uint24 poolFee, uint160 sqrtPriceX96) {
            IUniswapV3Pool pool = IUniswapV3Pool(poolAddr);

            token0 = pool.token0();
            token1 = pool.token1();
            poolFee = pool.fee();
            (sqrtPriceX96, , , , , ,) = pool.slot0();
    }

}