export const CONTRACT_ADDRESS = "0x86808FFD1204C2BD9Ad5B79022968D11408d3efc";

export const CONTRACT_ABI = [
  // Create listings
  "function postListingCollateralSell(uint256 durRaw, uint256 priceRaw, uint256 period, uint8 mask) external",
  "function postListingCollateralBuy(uint256 durRaw, uint256 priceRaw, uint256 period, uint8 mask, uint8 chosenToken) external",
  "function postListingNoCollateralSell(uint256 durRaw, uint256 priceRaw, uint256 period) external",
  "function postListingNoCollateralBuy(uint256 durRaw, uint256 priceRaw, uint256 period) external",

  // Cancel / Approve / Pay / Default
  "function cancelListing(uint256 listingId) external",
  "function approveListing(uint256 listingId, uint8 chosenToken) external",
  "function makePayment(uint256 listingId) external",
  "function claimDefault(uint256 listingId) external",
  "function payAfterDefault(uint256 listingId) external",

  // Final CreditSale ListingInfo tuple
  "function getListingById(uint256 listingId) view returns (tuple(uint256 id, address seller, address buyer, uint256 durAmount, uint256 priceUSDC, uint256 dueDate, uint256 paymentPeriod, uint8 status, bool isCollateral, uint8 collateralMask, uint8 collateralTokenId, uint256 collateralAmount, uint256 freeBL, uint256 totalBLValue, uint256 pendingBLValue, uint256[5] lockedPrices))",
  "function getPendingSellerListings(uint256 offset, uint256 limit) view returns (tuple(uint256 id, address seller, address buyer, uint256 durAmount, uint256 priceUSDC, uint256 dueDate, uint256 paymentPeriod, uint8 status, bool isCollateral, uint8 collateralMask, uint8 collateralTokenId, uint256 collateralAmount, uint256 freeBL, uint256 totalBLValue, uint256 pendingBLValue, uint256[5] lockedPrices)[])",
  "function getPendingBuyerListings(uint256 offset, uint256 limit) view returns (tuple(uint256 id, address seller, address buyer, uint256 durAmount, uint256 priceUSDC, uint256 dueDate, uint256 paymentPeriod, uint8 status, bool isCollateral, uint8 collateralMask, uint8 collateralTokenId, uint256 collateralAmount, uint256 freeBL, uint256 totalBLValue, uint256 pendingBLValue, uint256[5] lockedPrices)[])",
  "function getApprovedListings(uint256 offset, uint256 limit) view returns (tuple(uint256 id, address seller, address buyer, uint256 durAmount, uint256 priceUSDC, uint256 dueDate, uint256 paymentPeriod, uint8 status, bool isCollateral, uint8 collateralMask, uint8 collateralTokenId, uint256 collateralAmount, uint256 freeBL, uint256 totalBLValue, uint256 pendingBLValue, uint256[5] lockedPrices)[])",

  // Counts / ids
  "function pendingSellerCount() view returns (uint256)",
  "function pendingBuyerCount() view returns (uint256)",
  "function approvedCount() view returns (uint256)",
  "function nextListingId() view returns (uint256)",
  "function pendingSellerListingIds(uint256) view returns (uint256)",
  "function pendingBuyerListingIds(uint256) view returns (uint256)",
  "function approvedIds(uint256) view returns (uint256)",

  // BL / blacklist / default views
  "function blLevel(address buyer, address seller) view returns (uint256)",
  "function pairwiseBL(address buyer, address seller) view returns (uint256)",
  "function totalBL(address buyer) view returns (uint256)",
  "function totalBLLevel(address buyer) view returns (uint256)",
  "function freeTotalBL(address buyer) view returns (uint256)",
  "function pendingBuyNoCollateralBL(address buyer) view returns (uint256)",
  "function blacklist(address user) view returns (bool)",
  "function isBlacklisted(address user) view returns (bool)",
  "function unpaidNoCollateralDefaultCount(address user) view returns (uint256)",
  "function unpaidDefaultCount(address user) view returns (uint256)",

  // Collateral views
  "function previewCollateral(uint256 priceUSDC, uint8 tokenId) view returns (uint256)",
  "function requiredCollateral(uint256 priceUSDC, uint8 tokenId) view returns (uint256)",
  "function requiredCollateralLocked(uint256 priceUSDC, uint8 tokenId, uint256 lockedPrice) pure returns (uint256)",
  "function getCollateralAmount(uint256 listingId, uint8 tokenId) view returns (uint256)",

  // listingDetails public getter
  "function listingDetails(uint256 listingId) view returns (address seller, address buyer, uint256 durAmount, uint256 priceUSDC, uint256 dueDate, uint256 paymentPeriod, uint8 status, bool isCollateral, uint8 collateralMask, uint8 collateralTokenId, uint256 collateralAmount)",

  // Price oracles
  "function getBLTPriceUSDC() view returns (uint256)",
  "function getBLTSpotPriceUSDC() view returns (uint256)",
  "function getWBTCPriceUSDC() view returns (uint256)",
  "function getWETHPriceUSDC() view returns (uint256)",
  "function getTokenPriceUSDC(uint8 tokenId) view returns (uint256)",
  "function updateBLTPrice() external",
  "function lastBLTPriceUSDC() view returns (uint256)",

  // Token addresses
  "function USDC() view returns (address)",
  "function USDT() view returns (address)",
  "function DUR() view returns (address)",
  "function BLT() view returns (address)",
  "function WBTC() view returns (address)",
  "function WETH() view returns (address)",

  // Token constants
  "function TOKEN_USDC() view returns (uint8)",
  "function TOKEN_USDT() view returns (uint8)",
  "function TOKEN_BLT() view returns (uint8)",
  "function TOKEN_WBTC() view returns (uint8)",
  "function TOKEN_WETH() view returns (uint8)",
  "function TOKEN_COUNT() view returns (uint8)",

  // Pool ids / StateView
  "function bltPoolId() view returns (bytes32)",
  "function wbtcPoolId() view returns (bytes32)",
  "function wethPoolId() view returns (bytes32)",
  "function stateView() view returns (address)",

  // Events
  "event ListingCreated(uint256 indexed listingId, address indexed creator, uint256 durAmount, uint256 priceUSDC, uint256 paymentPeriod, bool isCollateral, uint8 collateralMask)",
  "event ListingApproved(uint256 indexed listingId, address indexed buyer, address indexed seller, uint256 durAmount, uint256 priceUSDC, uint256 dueDate, uint8 collateralTokenId, uint256 collateralAmount)",
  "event ListingCancelled(uint256 indexed listingId, address indexed canceller)",
  "event PaymentCompleted(uint256 indexed listingId, address indexed buyer, uint256 newPairwiseBL, uint256 newTotalBL, address indexed seller)",
  "event CollateralClaimed(address indexed claimer, uint256 indexed listingId, uint8 collateralTokenId, uint256 collateralAmount)",
  "event BuyerDefaulted(uint256 indexed listingId, address indexed buyer, address indexed seller, bool isCollateral, uint256 removedBL, uint256 newTotalBL)",
  "event BuyerRehabilitated(uint256 indexed listingId, address indexed buyer, address indexed seller, uint256 unpaidDefaultLeft)",
  "event TotalBLChanged(address indexed buyer, uint256 oldTotalBL, uint256 newTotalBL)",
  "event BLTPriceUpdated(uint256 newPrice, uint256 timestamp)",

  // Custom errors
  "error ReentrancyGuardReentrantCall()",
  "error SafeERC20FailedOperation(address token)"
];

export const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)"
];

export const TOKEN_ADDRESSES = {
  USDC: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
  USDT: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
  BLT:  "0xEac1b253E553E28c48535ed738dAB70204B5D28B",
  WBTC: "0x68f180fcCe6836688e9084f035309E29Bf0A2095",
  WETH: "0x4200000000000000000000000000000000000006",
  DUR:  "0xf2f471dd1fBD278e54a81af7D5a22E3a38eA43Ff",
};

export const TOKEN_IDS = {
  USDC: 0,
  USDT: 1,
  BLT: 2,
  WBTC: 3,
  WETH: 4
};

export const TOKEN_DECIMALS = {
  USDC: 6,
  USDT: 6,
  BLT: 18,
  WBTC: 8,
  WETH: 18,
  DUR: 18
};

export const TOKEN_COLORS = {
  USDC: "#2775CA",
  USDT: "#26A17B",
  BLT: "#FF6B35",
  WBTC: "#F7931A",
  WETH: "#627EEA",
  DUR: "#8B5CF6"
};

export const COLLATERAL_TOKENS = ["USDC", "USDT", "BLT", "WBTC", "WETH"];

export const OP_MAINNET = {
  chainId: 10,
  name: "Optimism",
  rpcUrl: "https://mainnet.optimism.io"
};

export function maskFromTokens(selectedTokens) {
  let mask = 0;
  selectedTokens.forEach((t) => {
    mask |= 1 << TOKEN_IDS[t];
  });
  return mask;
}

export function tokensFromMask(mask) {
  return COLLATERAL_TOKENS.filter((_, i) => (mask & (1 << i)) !== 0);
}