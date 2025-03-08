import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers.js";
import { expect } from "chai";
import hre from "hardhat";
import { deal } from "hardhat-deal";

describe("LiquidityProvider", function () {
  async function deployContract() {
    const code = await ethers.provider.getCode("0x82aF49447D8a07e3bd95BD0d56f35241523fBab1");
    const pool = await ethers.getContractAt("IUniswapV3Pool", "0xC6962004f452bE9203591991D15f6b388e09E8D0");
    //console.log("asd;lkfj;askdjfna;ldkfa", code)
    console.log("FIRST", pool)
    
    /*const network = await ethers.provider.getNetwork();
  
    console.log("Network Name:", network.name);
    console.log("Network Chain ID:", network.chainId);
    console.log("Current Block Number:", await ethers.provider.getBlockNumber());

  
    if (network.chainId === 42161) {
      console.log("Forked network is Arbitrum One.");
    } else {
      console.log("Not Arbitrum One. Current network chainId:", network.chainId);
    }

    const [owner] = await hre.ethers.getSigners();

    const npmAddress = "0xC36442b4a4522E871399CD717aBDD847Ab11FE88";

    const nfpManager = await ethers.getContractAt(
      "INonfungiblePositionManager", npmAddress
    );

    const liquidityManager = await hre.ethers.deployContract("LiquidityProvider", [npmAddress]);*/

    /*try {
      const pool = await ethers.getContractAt("IUniswapV3Pool", "0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640");
      console.log("Pool contract address:", pool.address);
    } catch (error) {
      console.error("Error loading contract:", error);
    }*/

    /*const token0 = await ethers.getContractAt("IERC20", await pool.token0());
    const token1 = await ethers.getContractAt("IERC20", await pool.token1());

    await token0.approve(liquidityManager, ethers.MaxUint256);
    await token1.approve(liquidityManager, ethers.MaxUint256);

    await deal(token0, owner, ethers.parseUnits("1000", 6));
    await deal(token1, owner, ethers.parseUnits("2", 18));

    console.log(await token0.balanceOf(owner));
    console.log(await token1.balanceOf(owner));*/

    //return { owner, /*liquidityProvider, token0, token1, pool, nfpManager };*/
    return pool;
  }

  describe("TestPoolAccess", function () {
    it("Should output right pull address", async function () {
      const pool = await loadFixture(deployContract);
      //console.log(await pool.token0())

      const factoryAddress = "0x1F98431c8aD98523631AE4a59f267346ea31F984";  // Uniswap V3 Factory contract address
      const tokenA = await pool.token0(); // Token A address (USDC)
      const tokenB = await pool.token1(); // Token B address (DAI)
      const feeTier = await pool.fee(); // Fee tier (0.3%)

      const factory = await ethers.getContractAt("IUniswapV3Factory", factoryAddress);

      const poolAddress = await factory.getPool(tokenA, tokenB, feeTier);

      expect(await poolAddress).to.equal("0xC6962004f452bE9203591991D15f6b388e09E8D0");
    });
  });

  /*describe("Deployment", function () {
    it("Should get right npmManager address", async function () {
      const { liquidityManager } = await loadFixture(deployContract);

      expect(await liquidityManager.positionManager()).to.equal("0xC36442b4a4522E871399CD717aBDD847Ab11FE88");
    });
  });

  describe("Maths", function () {
    const width = 1000;
    it(`Should provide liquidity with width = 1000 when amount0 = 0`, async function () {
      const { liquidityManager, nfpManager, pool, owner, token1 } = await loadFixture(deployContract);

      const amount1 = await token1.balanceOf(owner);
      await liquidityManager.addLiquidity(pool, 0, amount1, width)

      const positionId = await nfpManager.tokenOfOwnerByIndex(owner, 0);
      const position = await nfpManager.positions(positionId);

      const upperPrice = 1.0001 ** Number(position.tickUpper);
      const lowerPrice = 1.0001 ** Number(position.tickLower)

      expect(10000 * (upperPrice - lowerPrice) / (lowerPrice + upperPrice)).to.be.approximately(width, width * 0.1);
    })

    it(`Should provide liquidity with width = 1000 when amount1 = 0`, async function () {
      const { liquidityManager, nfpManager, pool, owner, token0 } = await loadFixture(deployContract);

      const amount0 = await token0.balanceOf(owner);
      await liquidityManager.addLiquidity(pool, amount0, 0, width)

      const positionId = await nfpManager.tokenOfOwnerByIndex(owner, 0);
      const position = await nfpManager.positions(positionId);

      const upperPrice = 1.0001 ** Number(position.tickUpper);
      const lowerPrice = 1.0001 ** Number(position.tickLower)

      expect(10000 * (upperPrice - lowerPrice) / (lowerPrice + upperPrice)).to.be.approximately(width, width * 0.1);
    });

    it(`Should provide liquidity with width = 1000`, async function () {
      const { liquidityManager, nfpManager, pool, owner, token0, token1 } = await loadFixture(deployContract);

      const amount0 = await token0.balanceOf(owner);
      const amount1 = await token1.balanceOf(owner);
      await liquidityManager.addLiquidity(pool, amount0, amount1, width)

      const positionId = await nfpManager.tokenOfOwnerByIndex(owner, 0);
      const position = await nfpManager.positions(positionId);

      const upperPrice = 1.0001 ** Number(position.tickUpper);
      const lowerPrice = 1.0001 ** Number(position.tickLower)

      expect(10000 * (upperPrice - lowerPrice) / (lowerPrice + upperPrice)).to.be.approximately(width, width * 0.1);
    });
  });*/
});