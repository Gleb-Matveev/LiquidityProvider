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
import "hardhat/console.sol";

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
        (address token0, address token1, uint24 poolFee, uint160 sqrtPriceX96, int24 tickSpacing) = getPoolParams(poolAddr);
        (int24 lowerTick, int24 upperTick) = getTicksFromBorders(/*amount0ToMint, amount1ToMint, */width, sqrtPriceX96); // вынести всю логику
        //address wealth = 0xF977814e90dA44bFA03b6295A0616a897441aceC;
        int24 tick_lower = TickMath.MIN_TICK;
        int24 tick_upper = TickMath.MAX_TICK;

        /*if (tick_lower % tickSpacing != 0) {
            tick_lower = (tick_lower / tickSpacing) * tickSpacing + tickSpacing;
        }

        if (tick_upper % tickSpacing != 0) {
            tick_upper = (tick_upper / tickSpacing) * tickSpacing;
        }*/

        IERC20(token0).transferFrom(msg.sender, address(this), amount0ToMint);
        IERC20(token1).transferFrom(msg.sender, address(this), amount1ToMint);

        IERC20(token0).approve(address(positionManager), amount0ToMint);
        IERC20(token1).approve(address(positionManager), amount1ToMint);

        console.log("token0: ", token0);
        console.log("token1: ", token1);
        console.log("fee: ", poolFee);
        //console.log("upperTick:", upperTick < 0 ? uint256(-upperTick) : uint256(upperTick));
        //console.log("lowerTick:", lowerTick < 0 ? uint256(-lowerTick) : uint256(lowerTick));
        tick_upper < 0 ? console.log("tick_upper: -", uint256(-tick_upper)) : console.log("tick_upper: ", uint256(tick_upper));
        tick_lower < 0 ? console.log("tick_lower: -", uint256(-tick_lower)) : console.log("tick_lower: ", uint256(tick_lower));
        console.log("token0 amt: ", amount0ToMint);
        console.log("token1 amt: ", amount1ToMint);
        console.log("balance of eth: ", address(this).balance);
        console.log("token0 balance: ", IERC20(token0).balanceOf(address(this)));
        console.log("token1 balance: ", IERC20(token1).balanceOf(address(this)));

        INonfungiblePositionManager.MintParams memory params =
            INonfungiblePositionManager.MintParams({
                token0: token0,
                token1: token1,
                fee: poolFee,
                tickLower: tick_lower,
                tickUpper: tick_upper,
                amount0Desired: amount0ToMint,
                amount1Desired: amount1ToMint,
                amount0Min: 0,
                amount1Min: 0,
                recipient: msg.sender,
                deadline: block.timestamp
            });

        //positionManager.totalSupply();
        (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1) = positionManager.mint(params);
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

    function getPoolParams(address poolAddr) internal view returns (address token0, address token1, uint24 poolFee, uint160 sqrtPriceX96, int24 tickSpacing) {
            IUniswapV3Pool pool = IUniswapV3Pool(poolAddr);

            token0 = pool.token0();
            token1 = pool.token1();
            poolFee = pool.fee();
            tickSpacing = pool.tickSpacing();
            (sqrtPriceX96, , , , , ,) = pool.slot0();
    }

    receive() external payable {
    }
}