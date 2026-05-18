const fs = require("fs");

const p = "src/pages/CreateListing.js";
let s = fs.readFileSync(p, "utf8");

// collateral sell
s = s.replace(
  "c.postListingCollateralSell(durRaw, usdcRaw, period, maskFromTokens(selectedCollaterals), collateralBufferBps)",
  "c.postListingCollateralSell(durRaw, usdcRaw, period, maskFromTokens(selectedCollaterals), collateralBufferBps, 0)"
);

// collateral buy
s = s.replace(
  "c.postListingCollateralBuy(durRaw, usdcRaw, period, singleMask, tokenId, collateralBufferBps)",
  "c.postListingCollateralBuy(durRaw, usdcRaw, period, singleMask, tokenId, collateralBufferBps, 0)"
);

// no collateral sell
s = s.replace(
  "c.postListingNoCollateralSell(durRaw, usdcRaw, period)",
  "c.postListingNoCollateralSell(durRaw, usdcRaw, period, 0)"
);

// no collateral buy
s = s.replace(
  "c.postListingNoCollateralBuy(durRaw, usdcRaw, period)",
  "c.postListingNoCollateralBuy(durRaw, usdcRaw, period, 0)"
);

fs.writeFileSync(p, s);

console.log("✅ expiresAt added");
