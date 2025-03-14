import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers.js";
import { expect } from "chai";
import hre from "hardhat";
import { deal } from "hardhat-deal";

function sqrt(value) {
  if (value < 0n) throw new Error("Negative BigInt");
  if (value < 2n) return value;
  
  let x = value;
  let y = (x + 1n) / 2n;
  while (y < x) {
      x = y;
      y = (x + value / x) / 2n;
  }
  return x;
}

function getAmounts(liquidity, sqrtPriceX96, tickLower, tickUpper) {
  liquidity = BigInt(liquidity);
  sqrtPriceX96 = BigInt(sqrtPriceX96);
  tickLower = BigInt(tickLower);
  tickUpper = BigInt(tickUpper);

  const Q96 = 2n ** 96n;

  // Вычисляем корни тиков через BigInt (используем приближение через 1.0001 ** tick)
  const sqrtRatioA = sqrt(BigInt(Math.floor(Number((1.0001 ** Number(tickLower)) * Number(Q96)))));
  const sqrtRatioB = sqrt(BigInt(Math.floor(Number((1.0001 ** Number(tickUpper)) * Number(Q96)))));
  const sqrtPrice = sqrtPriceX96;

  let amount0 = 0n;
  let amount1 = 0n;

  if (sqrtPrice <= sqrtRatioA) {
      amount0 = (liquidity * (sqrtRatioB - sqrtRatioA)) / (sqrtRatioA * sqrtRatioB);
  } else if (sqrtPrice >= sqrtRatioB) {
      amount1 = liquidity * (sqrtRatioB - sqrtRatioA);
  } else {
      amount0 = (liquidity * (sqrtRatioB - sqrtPrice)) / (sqrtPrice * sqrtRatioB);
      amount1 = liquidity * (sqrtPrice - sqrtRatioA);
  }

  console.log(amount0);
  console.log(amount1);
  return { amount0, amount1 };
}


describe("LiquidityProvider", function () {
  async function deployContract() {
    const [owner, addr1] = await ethers.getSigners();

    const npmAddress = "0xC36442b4a4522E871399CD717aBDD847Ab11FE88";

    const nfpManager = await ethers.getContractAt(
      "INonfungiblePositionManager", npmAddress
    );

    const liquidityProvider = await hre.ethers.deployContract("LiquidityProvider", [npmAddress]);
    const pool = await ethers.getContractAt("IUniswapV3Pool", "0x5969EFddE3cF5C0D9a88aE51E47d721096A97203");

    console.log(await pool.token0())
    console.log(await pool.token1())

    const token0 = await ethers.getContractAt("IERC20", await pool.token0()); // wbtc
    const token1 = await ethers.getContractAt("IERC20", await pool.token1()); // usdt

    console.log("ебаный кусок говна0", await token0.balanceOf("0x2DF3ace03098deef627B2E78546668Dd9B8EB8bC"));
    console.log("ебаный кусок говна1", await token1.balanceOf("0xF977814e90dA44bFA03b6295A0616a897441aceC"));
    console.log("eth balance 0: ",  await ethers.provider.getBalance("0x2DF3ace03098deef627B2E78546668Dd9B8EB8bC"));
    console.log("eth balance 1: ",  await ethers.provider.getBalance("0xF977814e90dA44bFA03b6295A0616a897441aceC"));
    console.log("ether bitch balance: ",  await ethers.provider.getBalance("0x25681Ab599B4E2CEea31F8B498052c53FC2D74db"));

    ///////////////////////////////////////////////////////////////////////////////////////////////////////

    const address0 = "0x2DF3ace03098deef627B2E78546668Dd9B8EB8bC";
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [address0],
    });

    const cm0 = await ethers.provider.getSigner(address0);
    const amount0 = ethers.parseUnits("1", 8);
    await token0.connect(cm0).transfer(owner, amount0);

    const address1 = "0xF977814e90dA44bFA03b6295A0616a897441aceC";
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [address1],
    });

    const cm1 = await ethers.provider.getSigner(address1);
    const amount1 = ethers.parseUnits("85000", 6);
    await token1.connect(cm1).transfer(owner, amount1);

    ///////////////////////////////////////////////////////////////////////////////////////////////////////

    console.log("after eth balance 0: ",  await ethers.provider.getBalance("0x2DF3ace03098deef627B2E78546668Dd9B8EB8bC"));
    console.log("after eth balance 1: ",  await ethers.provider.getBalance("0xF977814e90dA44bFA03b6295A0616a897441aceC"));

    await token0.approve(liquidityProvider, ethers.MaxUint256);
    await token1.approve(liquidityProvider, ethers.MaxUint256);

    return { owner, liquidityProvider, token0, token1, pool, nfpManager };
  }

  describe("Deployment", function () {
    it("Should get right npmManager address", async function () {
      const { owner, token0, token1, liquidityProvider } = await loadFixture(deployContract);
      const amount0 = await token0.balanceOf(owner);
      const amount1 = await token1.balanceOf(owner);
      console.log(amount0)
      console.log(amount1)

      expect(await liquidityProvider.positionManager()).to.equal("0xC36442b4a4522E871399CD717aBDD847Ab11FE88");
      expect(amount0).to.equal(100000000);
      expect(amount1).to.equal(85000000000);
    });
  });

  describe("Maths", function () {
    let width = 6000;
    it(`Should provide liquidity with width = ${width}`, async function () {
      const { liquidityProvider, nfpManager, pool, owner, token0, token1 } = await loadFixture(deployContract);

      const transferAmount = ethers.parseEther("3");

      const tx = await owner.sendTransaction({
       to: liquidityProvider.getAddress(),
       value: transferAmount,
      });

      await tx.wait();

      const amount0 = await token0.balanceOf(owner);
      const amount1 = await token1.balanceOf(owner);
      const amountLP0 = await token0.balanceOf(liquidityProvider.getAddress());
      const amountLP1 = await token1.balanceOf(liquidityProvider.getAddress());
      const balance = await ethers.provider.getBalance(owner);
      const balanceC = await ethers.provider.getBalance(liquidityProvider.getAddress());

      console.log("///////////////////////////////////////////////////////////////////////////////////////////////////////");
      console.log("a0: ", amount0);
      console.log("a1: ", amount1);
      console.log("width: ", width);
      console.log("LP a0: ", amountLP0);
      console.log("LP a1: ", amountLP1);
      console.log("Balance of owner:", balance);
      console.log("Contract address", await liquidityProvider.getAddress());
      console.log("///////////////////////////////////////////////////////////////////////////////////////////////////////\n");
    
      await liquidityProvider.provideLiquidity(pool, amount0, amount1, width, {
        gasLimit: 30000000, 
      });

      const positionId = await nfpManager.tokenOfOwnerByIndex(owner, 0);
      const position = await nfpManager.positions(positionId);

      const upperPrice = 1.0001 ** Number(position.tickUpper);
      const lowerPrice = 1.0001 ** Number(position.tickLower);

      const slot0 = await pool.slot0();
      const sqrtPriceX96 = slot0.sqrtPriceX96;

      console.log(`sqrtPriceX96: ${sqrtPriceX96.toString()}`);

      // Вычисляем amount0 и amount1
      const { amount0inpool, amount1inpool } = getAmounts(position.liquidity, sqrtPriceX96, position.tickLower, position.tickUpper);

      console.log("amt0: ", amount0inpool);
      console.log("amt1: ", amount1inpool);

      console.log("upperPrice: ", upperPrice)
      console.log("lowerPrice: ", lowerPrice)
      console.log("///////////////////////////////////////////////////////////////////////////////////////////////////////");

      expect(10000 * (upperPrice - lowerPrice) / (lowerPrice + upperPrice)).to.be.approximately(width, width * 0.1);
    });
    /*width = 9000;
    it(`Should provide liquidity with width = ${width}}`, async function () {
      const { liquidityProvider, nfpManager, pool, owner, token0, token1 } = await loadFixture(deployContract);

      const transferAmount = ethers.parseEther("3");

      const tx = await owner.sendTransaction({
       to: liquidityProvider.getAddress(),
       value: transferAmount,
      });

      await tx.wait();

      const amount0 = await token0.balanceOf(owner);
      const amount1 = await token1.balanceOf(owner);
      const amountLP0 = await token0.balanceOf(liquidityProvider.getAddress());
      const amountLP1 = await token1.balanceOf(liquidityProvider.getAddress());
      const balance = await ethers.provider.getBalance(owner);
      const balanceC = await ethers.provider.getBalance(liquidityProvider.getAddress());

      console.log("///////////////////////////////////////////////////////////////////////////////////////////////////////");
      console.log("a0: ", amount0);
      console.log("a1: ", amount1);
      console.log("width: ", width);
      console.log("LP a0: ", amountLP0);
      console.log("LP a1: ", amountLP1);
      console.log("Balance of owner:", balance);
      console.log("Contract address", await liquidityProvider.getAddress());
      console.log("///////////////////////////////////////////////////////////////////////////////////////////////////////\n");
    
      await liquidityProvider.provideLiquidity(pool, amount0, amount1, width, {
        gasLimit: 30000000, 
      });

      const positionId = await nfpManager.tokenOfOwnerByIndex(owner, 0);
      const position = await nfpManager.positions(positionId);

      const upperPrice = 1.0001 ** Number(position.tickUpper);
      const lowerPrice = 1.0001 ** Number(position.tickLower);

      console.log("upperPrice: ", upperPrice)
      console.log("lowerPrice: ", lowerPrice)
      console.log("///////////////////////////////////////////////////////////////////////////////////////////////////////");

      expect(10000 * (upperPrice - lowerPrice) / (lowerPrice + upperPrice)).to.be.approximately(width, width * 0.1);
    });*/
  });
});
