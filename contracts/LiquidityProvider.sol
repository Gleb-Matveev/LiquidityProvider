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

import "hardhat/console.sol";

contract LiquidityProvider {

    INonfungiblePositionManager public positionManager;

    constructor(address npmAddress) {
        positionManager = INonfungiblePositionManager(
            npmAddress
        );
    }

    function provideLiquidity(address poolAddr, uint256 amount0ToMint, uint256 amount1ToMint, uint160 width) external {
        (address token0, address token1, uint24 poolFee, uint160 sqrtPriceX96, int24 tickSpacing) = getPoolParams(poolAddr);
        (int24 tick_lower, int24 tick_upper) = getTicksFromBorders(amount0ToMint, amount1ToMint, width, sqrtPriceX96, tickSpacing); // вынести всю логику
        //int24 tick_lower = TickMath.MIN_TICK;
        //int24 tick_upper = TickMath.MAX_TICK;
        int24 price_tick = TickMath.getTickAtSqrtRatio(sqrtPriceX96);

        IERC20(token0).transferFrom(msg.sender, address(this), amount0ToMint);
        IERC20(token1).transferFrom(msg.sender, address(this), amount1ToMint);

        IERC20(token0).approve(address(positionManager), amount0ToMint);
        IERC20(token1).approve(address(positionManager), amount1ToMint);

        console.log("///////////////////////////////////////////////////////////////////////////////////////////////////////");
        console.log("token0: ", token0);
        console.log("token1: ", token1);
        console.log("fee: ", poolFee);
        //tick_upper < 0 ? console.log("tick_upper: -", uint256(-tick_upper)) : console.log("tick_upper: ", uint256(tick_upper));
        //tick_lower < 0 ? console.log("tick_lower: -", uint256(-tick_lower)) : console.log("tick_lower: ", uint256(tick_lower));
        price_tick < 0 ? console.log("price_tick: -", uint256(-price_tick)) : console.log("price_tick: ", uint256(price_tick));
        console.log("price: ", sqrtPriceX96);
        console.log("token0 amt: ", amount0ToMint);
        console.log("token1 amt: ", amount1ToMint);
        console.log("token0 balance: ", IERC20(token0).balanceOf(address(this)));
        console.log("token1 balance: ", IERC20(token1).balanceOf(address(this)));
        console.log("balance of eth: ", address(this).balance);
        console.log("///////////////////////////////////////////////////////////////////////////////////////////////////////\n");

        INonfungiblePositionManager.MintParams memory params =
            INonfungiblePositionManager.MintParams({
                token0: token0,
                token1: token1,
                fee: poolFee,
                tickLower: tick_lower,
                tickUpper: tick_upper,
                amount0Desired: amount0ToMint,
                amount1Desired: amount1ToMint,
                amount0Min: 10,
                amount1Min: 10,
                recipient: msg.sender,
                deadline: block.timestamp
            });

        (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1) = positionManager.mint(params);

        // добавить возврат средств
    }

    function getBordersFromAssets(uint256 amount0ToMint, uint256 amount1ToMint, uint160 width, uint160 sqrtPriceX96) internal pure returns (uint160 pa, uint160 pb) {
        // проверка на ноль
        uint160 t = uint160(FullMath.mulDiv((10000 + width), 1, (10000 - width)));
        //uint256 arg1 = sqrt(amount0ToMint * amount0ToMint * sqrtPriceX96 * sqrtPriceX96 * t);
        //pa = uint160(FullMath.mulDiv(-amount1ToMint, sqrtPriceX96, amount0ToMint * sqrtPriceX96 * sqrt(t) - amount0ToMint * sqrtPriceX96 - amount1ToMint * sqrt(t)));
        //pa = uint160(FullMath.mulDiv(-amount1ToMint, sqrtPriceX96, arg1 - amount0ToMint * sqrtPriceX96 - sqrt(amount1ToMint * amount1ToMint * t)));
        //pb = uint160(sqrt(uint160(FullMath.mulDiv(FullMath.mulDiv(pa, pa, 1), t, 1))));
        pa = sqrtPriceX96;
        pb = uint160(sqrt(FullMath.mulDiv(pa, pa * t, 1)));

        uint256 numerator = uint256(sqrtPriceX96) * uint256(sqrtPriceX96);
        uint256 denominator = 1 << 192;
        uint256 actP = numerator / denominator;

        uint256 numeratorPa = uint256(pa) * uint256(pa);
        uint256 actpa = numeratorPa / denominator;

        uint256 numeratorPb = uint256(pb) * uint256(pb);
        uint256 actpb = numeratorPb / denominator;

        console.log("pa:", pa);
        console.log("pb:", pb);
        console.log("p current:", actP);
        console.log("t:", t);
        //console.log("Width = ", FullMath.mulDiv(pb * pb - pa * pa, 10000, pb * pb + pa * pa));
        console.log("Width = ", FullMath.mulDiv(actpb - actpa, 10000, actpb + actpa));
    }

    function getTicksFromBorders(uint256 amount0ToMint, uint256 amount1ToMint, uint160 width, uint160 sqrtPriceX96,  int24 tickSpacing) internal pure returns (int24 lowerTick, int24 upperTick) {
        (uint160 pa, uint160 pb) = getBordersFromAssets(amount0ToMint, amount1ToMint, width, sqrtPriceX96);

        lowerTick = TickMath.getTickAtSqrtRatio(pa) - 7;
        upperTick = TickMath.getTickAtSqrtRatio(pb);
        //lowerTick = TickMath.MIN_TICK;
        //upperTick = TickMath.MAX_TICK;
        console.log("///////////////////////////////////////////////////////////////////////////////////////////////////////");
        console.log("BEFORE");
        upperTick < 0 ? console.log("upperTick: -", uint256(-upperTick)) : console.log("upperTick: ", uint256(upperTick));
        lowerTick < 0 ? console.log("lowerTick: -", uint256(-lowerTick)) : console.log("lowerTick: ", uint256(lowerTick));

        if (lowerTick % tickSpacing != 0) {
            lowerTick = (lowerTick / tickSpacing) * tickSpacing + tickSpacing;
        }

        if (upperTick % tickSpacing != 0) {
            upperTick = (upperTick / tickSpacing) * tickSpacing;
        }

        console.log("BEFORE");
        upperTick < 0 ? console.log("upperTick: -", uint256(-upperTick)) : console.log("upperTick: ", uint256(upperTick));
        lowerTick < 0 ? console.log("lowerTick: -", uint256(-lowerTick)) : console.log("lowerTick: ", uint256(lowerTick));
        console.log("///////////////////////////////////////////////////////////////////////////////////////////////////////\n");
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

    function sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }

    function sqrt160(uint160 x) internal pure returns (uint160) {
        if (x == 0) return 0;

        uint160 result = x;
        uint160 bit = 1 << 158;

        while (bit > x) bit >>= 2;
        while (bit != 0) {
            uint160 temp = result + bit;
            result >>= 1;
            if (x >= temp) {
                x -= temp;
                result += bit;
            }
            bit >>= 2;
        }
        return result;
    }

    function sqrt256(uint256 x) internal pure returns (uint256) {
        uint256 result = x;
        uint256 bit = 1 << 254; // Largest power of 2 <= x

        while (bit > x) bit >>= 2;
        while (bit != 0) {
            uint256 temp = result + bit;
            result >>= 1;
            if (x >= temp) {
                x -= temp;
                result += bit;
            }
            bit >>= 2;
        }
        return result;
    }

}