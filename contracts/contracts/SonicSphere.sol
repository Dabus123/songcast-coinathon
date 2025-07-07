// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract SonicSphere is ERC721URIStorage, ERC721Enumerable, Ownable {
    using Counters for Counters.Counter;
    
    Counters.Counter private _tokenIdCounter;
    
    // Fee constant
    uint256 public constant FEATURED_TRACK_FEE = 0.01 ether;
    
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
    
    // Track ID => Track info
    mapping(uint256 => Track) public tracks;
    
    // Featured tracks
    mapping(uint256 => bool) private _featured;
    uint256[] private _featuredTracks;
    
    // User's purchased tracks
    mapping(address => uint256[]) private purchasedTracks;
    
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
    
    constructor() ERC721("SonicSphere", "SONIC") Ownable(msg.sender) {}
    
    // Internal function to check if token exists
    function _exists(uint256 tokenId) internal view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }
    
    // Create a new track
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
        }
        
        // Increment counter and mint NFT
        _tokenIdCounter.increment();
        uint256 tokenId = _tokenIdCounter.current();
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, metadataURI);
        
        // Set track info
        tracks[tokenId] = Track({
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
        
        // Add to featured tracks if applicable
        if (featured) {
            _featured[tokenId] = true;
            _featuredTracks.push(tokenId);
        }
        
        emit TrackCreated(tokenId, msg.sender, title, price, featured);
        
        return tokenId;
    }
    
    // Purchase a track
    function purchaseTrack(uint256 tokenId) public payable {
        require(_exists(tokenId), "Track does not exist");
        Track storage track = tracks[tokenId];
        require(msg.value >= track.price, "Insufficient funds");
        
        address owner = ownerOf(tokenId);
        require(owner != msg.sender, "Cannot purchase your own track");
        
        // Transfer NFT to buyer
        _transfer(owner, msg.sender, tokenId);
        
        // Transfer funds to seller
        (bool success, ) = track.seller.call{value: msg.value}("");
        require(success, "Failed to send payment to seller");
        
        // Add to user's purchased tracks
        purchasedTracks[msg.sender].push(tokenId);
        
        emit TrackPurchased(tokenId, msg.sender, owner, msg.value);
    }
    
    // Feature a track by paying the feature fee
    function featureTrack(uint256 tokenId) public payable {
        require(_exists(tokenId), "Track does not exist");
        require(ownerOf(tokenId) == msg.sender, "Not the owner");
        require(msg.value >= FEATURED_TRACK_FEE, "Insufficient fee");
        
        Track storage track = tracks[tokenId];
        require(!track.featured, "Track already featured");
        
        // Set as featured
        track.featured = true;
        _featured[tokenId] = true;
        _featuredTracks.push(tokenId);
        
        emit TrackFeatured(tokenId, msg.sender);
    }
    
    // Update track price
    function updatePrice(uint256 tokenId, uint256 newPrice) public {
        require(_exists(tokenId), "Track does not exist");
        require(ownerOf(tokenId) == msg.sender, "Not the owner");
        require(newPrice > 0, "Price must be greater than 0");
        
        tracks[tokenId].price = newPrice;
        
        emit PriceUpdated(tokenId, newPrice);
    }
    
    // Get featured tracks
    function getFeaturedTracks() public view returns (uint256[] memory) {
        return _featuredTracks;
    }
    
    // Get tracks by index range
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
    
    // Get purchased tracks for a user
    function getPurchasedTracks(address user) public view returns (uint256[] memory) {
        return purchasedTracks[user];
    }
    
    // Override functions to resolve conflicts between ERC721Enumerable and ERC721URIStorage
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        require(_exists(tokenId), "Token does not exist");
        return tracks[tokenId].metadataURI;
    }
    
    function _update(address to, uint256 tokenId, address auth) internal override(ERC721, ERC721Enumerable) returns (address) {
        return super._update(to, tokenId, auth);
    }
    
    function _increaseBalance(address account, uint128 value) internal override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }
    
    function supportsInterface(bytes4 interfaceId) public view override(ERC721Enumerable, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
} 