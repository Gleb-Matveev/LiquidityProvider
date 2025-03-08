import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers.js";
import { expect } from "chai";
import hre from "hardhat";
import { deal } from "hardhat-deal";

describe("LiquidityProvider", function () {
  async function deployContract() {
    const [owner] = await hre.ethers.getSigners();

    const npmAddress = "0xC36442b4a4522E871399CD717aBDD847Ab11FE88";

    const nfpManager = await ethers.getContractAt(
      "INonfungiblePositionManager", npmAddress
    );

    const liquidityProvider = await hre.ethers.deployContract("LiquidityProvider", [npmAddress]);
    const pool = await ethers.getContractAt("IUniswapV3Pool", "0xC6962004f452bE9203591991D15f6b388e09E8D0");

    console.log(await pool.token0())
    console.log(await pool.token1())

    const token0 = await ethers.getContractAt("IERC20", await pool.token0());
    const token1 = await ethers.getContractAt("IERC20", await pool.token1());

    await token0.approve(liquidityProvider, ethers.MaxUint256);
    await token1.approve(liquidityProvider, ethers.MaxUint256);

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    const amount0 = ethers.parseUnits("1000", 6);
    const impersonatedAccount0 = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [impersonatedAccount0],
    }); 
    const impersonatedSigner0 = await ethers.getSigner(impersonatedAccount0);
    await token0.connect(impersonatedSigner0).transfer(owner.address, amount0);

    const amount1 = ethers.parseUnits("2000", 6);
    const impersonatedAccount1 = "0xe8CDF27AcD73a434D661C84887215F7598e7d0d3"
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [impersonatedAccount1],
    }); 
    const impersonatedSigner1 = await ethers.getSigner(impersonatedAccount1);
    await token1.connect(impersonatedSigner1).transfer(owner.address, amount1);

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
      expect(amount0).to.equal(1000000000n);
      expect(amount1).to.equal(2000000000n);
    });
  });

  describe("Maths", function () {
    const width = 1000;
    it(`Should provide liquidity with width = 1000`, async function () {
      const { liquidityProvider, nfpManager, pool, owner, token0, token1 } = await loadFixture(deployContract);

      const amount0 = await token0.balanceOf(owner);
      const amount1 = await token1.balanceOf(owner);
      await liquidityProvider.provideLiquidity(pool, amount0, amount1, width)

      //const positionId = await nfpManager.tokenOfOwnerByIndex(owner, 0);
      //const position = await nfpManager.positions(positionId);

      //const upperPrice = 1.0001 ** Number(position.tickUpper);
      //const lowerPrice = 1.0001 ** Number(position.tickLower)

      //expect(10000 * (upperPrice - lowerPrice) / (lowerPrice + upperPrice)).to.be.approximately(width, width * 0.1);
    });
  });
});