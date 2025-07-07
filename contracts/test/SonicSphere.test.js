const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SonicSphere", function () {
  let SonicSphere;
  let sonicSphere;
  let owner;
  let artist;
  let buyer;
  let addrs;

  beforeEach(async function () {
    // Get signers
    [owner, artist, buyer, ...addrs] = await ethers.getSigners();

    // Deploy the contract
    SonicSphere = await ethers.getContractFactory("SonicSphere");
    sonicSphere = await SonicSphere.deploy();
    await sonicSphere.waitForDeployment();
  });

  describe("Track Creation", function () {
    it("Should create a track", async function () {
      const tokenURI = "ipfs://testCID";
      const price = ethers.parseEther("0.1");
      const royaltyPercentage = 10;

      await sonicSphere.connect(artist).createTrack(tokenURI, price, royaltyPercentage);
      
      const tokenId = 1;
      expect(await sonicSphere.ownerOf(tokenId)).to.equal(artist.address);
      expect(await sonicSphere.tokenURI(tokenId)).to.equal(tokenURI);
      expect(await sonicSphere.getTrackPrice(tokenId)).to.equal(price);
      expect(await sonicSphere.getArtist(tokenId)).to.equal(artist.address);
      expect(await sonicSphere.getRoyaltyPercentage(tokenId)).to.equal(royaltyPercentage);
    });
  });

  describe("Track Purchase", function () {
    beforeEach(async function () {
      const tokenURI = "ipfs://testCID";
      const price = ethers.parseEther("0.1");
      const royaltyPercentage = 10;

      await sonicSphere.connect(artist).createTrack(tokenURI, price, royaltyPercentage);
    });

    it("Should allow purchase of a track", async function () {
      const tokenId = 1;
      const price = await sonicSphere.getTrackPrice(tokenId);

      // Initial balances
      const initialArtistBalance = await ethers.provider.getBalance(artist.address);
      
      // Purchase the track
      await sonicSphere.connect(buyer).purchaseTrack(tokenId, { value: price });
      
      // Check ownership transferred
      expect(await sonicSphere.ownerOf(tokenId)).to.equal(buyer.address);
      
      // Check artist received payment
      const finalArtistBalance = await ethers.provider.getBalance(artist.address);
      expect(finalArtistBalance).to.be.gt(initialArtistBalance);
    });

    it("Should revert if insufficient funds sent", async function () {
      const tokenId = 1;
      const price = await sonicSphere.getTrackPrice(tokenId);
      const insufficientPrice = price - ethers.parseEther("0.01");

      await expect(
        sonicSphere.connect(buyer).purchaseTrack(tokenId, { value: insufficientPrice })
      ).to.be.revertedWith("Insufficient funds");
    });
  });

  describe("Featured Tracks", function () {
    beforeEach(async function () {
      // Create multiple tracks
      await sonicSphere.connect(artist).createTrack("ipfs://CID1", ethers.parseEther("0.1"), 10);
      await sonicSphere.connect(artist).createTrack("ipfs://CID2", ethers.parseEther("0.2"), 10);
      await sonicSphere.connect(artist).createTrack("ipfs://CID3", ethers.parseEther("0.3"), 10);
    });

    it("Should set and get featured tracks", async function () {
      // Set featured tracks
      await sonicSphere.connect(owner).setFeatured(1, true);
      await sonicSphere.connect(owner).setFeatured(3, true);
      
      // Get featured tracks
      const featuredTracks = await sonicSphere.getFeaturedTracks();
      
      expect(featuredTracks.length).to.equal(2);
      expect(featuredTracks[0]).to.equal(1);
      expect(featuredTracks[1]).to.equal(3);
    });

    it("Should only allow owner to set featured tracks", async function () {
      await expect(
        sonicSphere.connect(artist).setFeatured(1, true)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
}); 