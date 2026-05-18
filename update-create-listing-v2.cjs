const fs = require("fs");

const p = "src/pages/CreateListing.js";
let s = fs.readFileSync(p, "utf8");

// previewCollateral(..., tokenId) -> previewCollateral(..., tokenId, 0)
s = s.replaceAll(
  "previewCollateral(priceRaw, tokenId)",
  "previewCollateral(priceRaw, tokenId, 0)"
);

// collateral-buy preview
s = s.replaceAll(
  "previewCollateral(usdcRaw, tokenId)",
  "previewCollateral(usdcRaw, tokenId, collateralBufferBps || 0)"
);

// collateral-sell create
s = s.replaceAll(
  "postListingCollateralSell(durRaw, usdcRaw, period, maskFromTokens(selectedCollaterals))",
  "postListingCollateralSell(durRaw, usdcRaw, period, maskFromTokens(selectedCollaterals), collateralBufferBps || 0, 0)"
);

// collateral-buy create
s = s.replaceAll(
  "postListingCollateralBuy(durRaw, usdcRaw, period, singleMask, tokenId)",
  "postListingCollateralBuy(durRaw, usdcRaw, period, singleMask, tokenId, collateralBufferBps || 0, 0)"
);

// no-collateral sell
s = s.replaceAll(
  "postListingNoCollateralSell(durRaw, usdcRaw, period)",
  "postListingNoCollateralSell(durRaw, usdcRaw, period, 0)"
);

// no-collateral buy
s = s.replaceAll(
  "postListingNoCollateralBuy(durRaw, usdcRaw, period)",
  "postListingNoCollateralBuy(durRaw, usdcRaw, period, 0)"
);

fs.writeFileSync(p, s);

console.log("✅ CreateListing.js updated");
