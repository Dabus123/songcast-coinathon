// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title SonicSphere
 * @dev Music NFT platform for artists to create, sell, and manage music tracks
 */
contract SonicSphere is ERC721Enumerable, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;
    
    // Fee constants
    uint256 public constant PLATFORM_FEE_PERCENTAGE = 10; // 10% platform fee
    uint256 public constant FEATURED_TRACK_FEE = 0.01 ether; // Fee to feature a track
    
    // Track struct to store track metadata
    struct Track {
        string title;
        string description;
        uint256 price;
        string genre;
        string audioURI;
        string imageURI;
        string metadataURI;
        address payable seller;
        bool featured;
        uint256 duration;
        uint256 createdAt;
    }
    
    // Maps tokenId to Track
    mapping(uint256 => Track) public tracks;
    
    // Maps user address to their purchased tracks
    mapping(address => uint256[]) private purchasedTracks;
    
    // Array of featured track IDs
    uint256[] private featuredTracks;
    
    // Platform fee balance
    uint256 private platformFeeBalance;
    
    // Events
    event TrackCreated(
        uint256 indexed tokenId, 
        address indexed creator, 
        string title, 
        uint256 price, 
        bool featured
    );
    
    event TrackPurchased(
        uint256 indexed tokenId, 
        address indexed buyer, 
        address indexed seller, 
        uint256 price
    );
    
    event TrackFeatured(
        uint256 indexed tokenId, 
        address indexed owner
    );
    
    event PriceUpdated(
        uint256 indexed tokenId, 
        uint256 newPrice
    );
    
    /**
     * @dev Initialize the contract
     */
    constructor() ERC721("SonicSphere", "SONIC") Ownable(msg.sender) {}
    
    /**
     * @dev Create a new music track as NFT
     * @param title Track title
     * @param description Track description
     * @param price Track price in wei
     * @param genre Track genre
     * @param audioURI URI to audio file
     * @param imageURI URI to cover image
     * @param metadataURI URI to additional metadata
     * @param featured Whether to feature the track
     * @param duration Track duration in seconds
     * @return tokenId The id of the new track
     */
    function createTrack(
        string memory title,
        string memory description,
        uint256 price,
        string memory genre,
        string memory audioURI,
        string memory imageURI,
        string memory metadataURI,
        bool featured,
        uint256 duration
    ) public payable returns (uint256) {
        require(bytes(title).length > 0, "Title cannot be empty");
        require(bytes(audioURI).length > 0, "Audio URI cannot be empty");
        require(price > 0, "Price must be greater than 0");
        
        // If featured, require the feature fee
        if (featured) {
            require(msg.value >= FEATURED_TRACK_FEE, "Insufficient fee for featuring");
            platformFeeBalance += msg.value;
        }
        
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();
        
        // Create the track
        tracks[newTokenId] = Track({
            title: title,
            description: description,
            price: price,
            genre: genre,
            audioURI: audioURI,
            imageURI: imageURI,
            metadataURI: metadataURI,
            seller: payable(msg.sender),
            featured: featured,
            duration: duration,
            createdAt: block.timestamp
        });
        
        // Mint the NFT to the creator
        _mint(msg.sender, newTokenId);
        
        // Add to featured tracks if applicable
        if (featured) {
            featuredTracks.push(newTokenId);
        }
        
        emit TrackCreated(newTokenId, msg.sender, title, price, featured);
        
        return newTokenId;
    }
    
    /**
     * @dev Purchase a track
     * @param tokenId The track ID to purchase
     */
    function purchaseTrack(uint256 tokenId) public payable {
        require(_exists(tokenId), "Token does not exist");
        Track storage track = tracks[tokenId];
        require(msg.value >= track.price, "Insufficient funds");
        
        address owner = ownerOf(tokenId);
        require(owner != msg.sender, "Cannot purchase your own track");
        
        // Calculate platform fee
        uint256 platformFee = (msg.value * PLATFORM_FEE_PERCENTAGE) / 100;
        uint256 sellerAmount = msg.value - platformFee;
        
        // Update platform fee balance
        platformFeeBalance += platformFee;
        
        // Transfer funds to seller
        (bool success, ) = track.seller.call{value: sellerAmount}("");
        require(success, "Transfer to seller failed");
        
        // Transfer NFT ownership
        _transfer(owner, msg.sender, tokenId);
        
        // Add to user's purchased tracks
        purchasedTracks[msg.sender].push(tokenId);
        
        emit TrackPurchased(tokenId, msg.sender, owner, msg.value);
    }
    
    /**
     * @dev Feature a track by paying the feature fee
     * @param tokenId The track ID to feature
     */
    function featureTrack(uint256 tokenId) public payable {
        require(_exists(tokenId), "Token does not exist");
        require(ownerOf(tokenId) == msg.sender, "Not the owner");
        require(msg.value >= FEATURED_TRACK_FEE, "Insufficient fee");
        
        Track storage track = tracks[tokenId];
        require(!track.featured, "Track already featured");
        
        // Set as featured
        track.featured = true;
        featuredTracks.push(tokenId);
        
        // Add fee to platform balance
        platformFeeBalance += msg.value;
        
        emit TrackFeatured(tokenId, msg.sender);
    }
    
    /**
     * @dev Update track price
     * @param tokenId The track ID to update
     * @param newPrice The new price
     */
    function updatePrice(uint256 tokenId, uint256 newPrice) public {
        require(_exists(tokenId), "Token does not exist");
        require(ownerOf(tokenId) == msg.sender, "Not the owner");
        require(newPrice > 0, "Price must be greater than 0");
        
        tracks[tokenId].price = newPrice;
        
        emit PriceUpdated(tokenId, newPrice);
    }
    
    /**
     * @dev Get featured tracks
     * @return Array of featured track IDs
     */
    function getFeaturedTracks() public view returns (uint256[] memory) {
        return featuredTracks;
    }
    
    /**
     * @dev Get tracks by index range
     * @param from Starting index
     * @param to Ending index
     * @return Array of track IDs
     */
    function getTracks(uint256 from, uint256 to) public view returns (uint256[] memory) {
        require(from <= to, "Invalid range");
        require(to < totalSupply(), "Index out of bounds");
        
        uint256 size = to - from + 1;
        uint256[] memory result = new uint256[](size);
        
        for (uint256 i = 0; i < size; i++) {
            result[i] = tokenByIndex(from + i);
        }
        
        return result;
    }
    
    /**
     * @dev Get purchased tracks for a user
     * @param user The user address
     * @return Array of purchased track IDs
     */
    function getPurchasedTracks(address user) public view returns (uint256[] memory) {
        return purchasedTracks[user];
    }
    
    /**
     * @dev Withdraw platform fees to contract owner
     */
    function withdrawFees() public onlyOwner {
        require(platformFeeBalance > 0, "No fees to withdraw");
        
        uint256 amount = platformFeeBalance;
        platformFeeBalance = 0;
        
        (bool success, ) = owner().call{value: amount}("");
        require(success, "Transfer failed");
    }
    
    /**
     * @dev Check if token exists
     * @param tokenId The token ID to check
     * @return Whether the token exists
     */
    function _exists(uint256 tokenId) internal view returns (bool) {
        try this.ownerOf(tokenId) returns (address) {
            return true;
        } catch {
            return false;
        }
    }
    
    /**
     * @dev Override tokenURI to return custom metadata URI
     * @param tokenId The token ID
     * @return The metadata URI
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "Token does not exist");
        return tracks[tokenId].metadataURI;
    }
} 