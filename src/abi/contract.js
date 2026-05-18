
export const CONTRACT_ADDRESS = "0xc96A9D80E03BC97EDb7DB189c0bE233aD151F232";

export const CONTRACT_ABI = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "ReentrancyGuardReentrantCall",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      }
    ],
    "name": "SafeERC20FailedOperation",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "listingId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "buyer",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "seller",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "isCollateral",
        "type": "bool"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "removedBL",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "newTotalBL",
        "type": "uint256"
      }
    ],
    "name": "BuyerDefaulted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "listingId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "buyer",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "seller",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "unpaidDefaultLeft",
        "type": "uint256"
      }
    ],
    "name": "BuyerRehabilitated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "claimer",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "listingId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint8",
        "name": "collateralTokenId",
        "type": "uint8"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "collateralAmount",
        "type": "uint256"
      }
    ],
    "name": "CollateralClaimed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "listingId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "buyer",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "seller",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "durAmount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "priceUSDC",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "dueDate",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint8",
        "name": "collateralTokenId",
        "type": "uint8"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "collateralAmount",
        "type": "uint256"
      }
    ],
    "name": "ListingApproved",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "listingId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "canceller",
        "type": "address"
      }
    ],
    "name": "ListingCancelled",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "listingId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "creator",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "durAmount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "priceUSDC",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "paymentPeriod",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "isCollateral",
        "type": "bool"
      },
      {
        "indexed": false,
        "internalType": "uint8",
        "name": "collateralMask",
        "type": "uint8"
      },
      {
        "indexed": false,
        "internalType": "uint16",
        "name": "collateralBufferBps",
        "type": "uint16"
      },
      {
        "indexed": false,
        "internalType": "uint40",
        "name": "expiresAt",
        "type": "uint40"
      }
    ],
    "name": "ListingCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "listingId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "buyer",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "newPairwiseBL",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "newTotalBL",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "seller",
        "type": "address"
      }
    ],
    "name": "PaymentCompleted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "listingId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "uint8",
        "name": "tokenId",
        "type": "uint8"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "lockedPrice",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "livePrice",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint16",
        "name": "maxDeviationBps",
        "type": "uint16"
      }
    ],
    "name": "PriceDeviationChecked",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "buyer",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "oldTotalBL",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "newTotalBL",
        "type": "uint256"
      }
    ],
    "name": "TotalBLChanged",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "BLT",
    "outputs": [
      {
        "internalType": "contract IERC20",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "DUR",
    "outputs": [
      {
        "internalType": "contract IERC20",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MAX_COLLATERAL_BUFFER_BPS",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MAX_PERIOD_DAYS",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MIN_PERIOD_DAYS",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "TOKEN_BLT",
    "outputs": [
      {
        "internalType": "uint8",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "TOKEN_COUNT",
    "outputs": [
      {
        "internalType": "uint8",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "TOKEN_USDC",
    "outputs": [
      {
        "internalType": "uint8",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "TOKEN_USDT",
    "outputs": [
      {
        "internalType": "uint8",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "TOKEN_WBTC",
    "outputs": [
      {
        "internalType": "uint8",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "TOKEN_WETH",
    "outputs": [
      {
        "internalType": "uint8",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "USDC",
    "outputs": [
      {
        "internalType": "contract IERC20",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "USDT",
    "outputs": [
      {
        "internalType": "contract IERC20",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "WBTC",
    "outputs": [
      {
        "internalType": "contract IERC20",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "WETH",
    "outputs": [
      {
        "internalType": "contract IERC20",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "buyer",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "seller",
        "type": "address"
      }
    ],
    "name": "activeExposure",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "activePairwiseExposure",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "listingId",
        "type": "uint256"
      },
      {
        "internalType": "uint8",
        "name": "chosenToken",
        "type": "uint8"
      },
      {
        "internalType": "uint16",
        "name": "maxPriceDeviationBps",
        "type": "uint16"
      }
    ],
    "name": "approveListing",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "approvedCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "approvedIds",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "buyer",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "seller",
        "type": "address"
      }
    ],
    "name": "availableUncollateralizedRoom",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "buyer",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "seller",
        "type": "address"
      }
    ],
    "name": "blLevel",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "blacklist",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "bltPoolId",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "listingId",
        "type": "uint256"
      }
    ],
    "name": "cancelListing",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "listingId",
        "type": "uint256"
      }
    ],
    "name": "claimDefault",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "buyer",
        "type": "address"
      }
    ],
    "name": "freeTotalBL",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "offset",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "limit",
        "type": "uint256"
      }
    ],
    "name": "getApprovedListings",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "id",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "seller",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "buyer",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "durAmount",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "priceUSDC",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "dueDate",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "paymentPeriod",
            "type": "uint256"
          },
          {
            "internalType": "enum CreditSale.ListingStatus",
            "name": "status",
            "type": "uint8"
          },
          {
            "internalType": "bool",
            "name": "isCollateral",
            "type": "bool"
          },
          {
            "internalType": "uint8",
            "name": "collateralMask",
            "type": "uint8"
          },
          {
            "internalType": "uint8",
            "name": "collateralTokenId",
            "type": "uint8"
          },
          {
            "internalType": "uint16",
            "name": "collateralBufferBps",
            "type": "uint16"
          },
          {
            "internalType": "uint40",
            "name": "expiresAt",
            "type": "uint40"
          },
          {
            "internalType": "uint256",
            "name": "collateralAmount",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "freeBL",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "totalBLValue",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "pendingBLValue",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "activeExposure",
            "type": "uint256"
          },
          {
            "internalType": "uint256[5]",
            "name": "lockedPrices",
            "type": "uint256[5]"
          }
        ],
        "internalType": "struct CreditSale.ListingInfo[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBLTPriceUSDC",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "listingId",
        "type": "uint256"
      },
      {
        "internalType": "uint8",
        "name": "tokenId",
        "type": "uint8"
      }
    ],
    "name": "getCollateralAmount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "listingId",
        "type": "uint256"
      }
    ],
    "name": "getListingById",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "id",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "seller",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "buyer",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "durAmount",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "priceUSDC",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "dueDate",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "paymentPeriod",
            "type": "uint256"
          },
          {
            "internalType": "enum CreditSale.ListingStatus",
            "name": "status",
            "type": "uint8"
          },
          {
            "internalType": "bool",
            "name": "isCollateral",
            "type": "bool"
          },
          {
            "internalType": "uint8",
            "name": "collateralMask",
            "type": "uint8"
          },
          {
            "internalType": "uint8",
            "name": "collateralTokenId",
            "type": "uint8"
          },
          {
            "internalType": "uint16",
            "name": "collateralBufferBps",
            "type": "uint16"
          },
          {
            "internalType": "uint40",
            "name": "expiresAt",
            "type": "uint40"
          },
          {
            "internalType": "uint256",
            "name": "collateralAmount",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "freeBL",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "totalBLValue",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "pendingBLValue",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "activeExposure",
            "type": "uint256"
          },
          {
            "internalType": "uint256[5]",
            "name": "lockedPrices",
            "type": "uint256[5]"
          }
        ],
        "internalType": "struct CreditSale.ListingInfo",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "offset",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "limit",
        "type": "uint256"
      }
    ],
    "name": "getPendingBuyerListings",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "id",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "seller",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "buyer",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "durAmount",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "priceUSDC",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "dueDate",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "paymentPeriod",
            "type": "uint256"
          },
          {
            "internalType": "enum CreditSale.ListingStatus",
            "name": "status",
            "type": "uint8"
          },
          {
            "internalType": "bool",
            "name": "isCollateral",
            "type": "bool"
          },
          {
            "internalType": "uint8",
            "name": "collateralMask",
            "type": "uint8"
          },
          {
            "internalType": "uint8",
            "name": "collateralTokenId",
            "type": "uint8"
          },
          {
            "internalType": "uint16",
            "name": "collateralBufferBps",
            "type": "uint16"
          },
          {
            "internalType": "uint40",
            "name": "expiresAt",
            "type": "uint40"
          },
          {
            "internalType": "uint256",
            "name": "collateralAmount",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "freeBL",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "totalBLValue",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "pendingBLValue",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "activeExposure",
            "type": "uint256"
          },
          {
            "internalType": "uint256[5]",
            "name": "lockedPrices",
            "type": "uint256[5]"
          }
        ],
        "internalType": "struct CreditSale.ListingInfo[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "offset",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "limit",
        "type": "uint256"
      }
    ],
    "name": "getPendingSellerListings",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "id",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "seller",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "buyer",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "durAmount",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "priceUSDC",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "dueDate",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "paymentPeriod",
            "type": "uint256"
          },
          {
            "internalType": "enum CreditSale.ListingStatus",
            "name": "status",
            "type": "uint8"
          },
          {
            "internalType": "bool",
            "name": "isCollateral",
            "type": "bool"
          },
          {
            "internalType": "uint8",
            "name": "collateralMask",
            "type": "uint8"
          },
          {
            "internalType": "uint8",
            "name": "collateralTokenId",
            "type": "uint8"
          },
          {
            "internalType": "uint16",
            "name": "collateralBufferBps",
            "type": "uint16"
          },
          {
            "internalType": "uint40",
            "name": "expiresAt",
            "type": "uint40"
          },
          {
            "internalType": "uint256",
            "name": "collateralAmount",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "freeBL",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "totalBLValue",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "pendingBLValue",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "activeExposure",
            "type": "uint256"
          },
          {
            "internalType": "uint256[5]",
            "name": "lockedPrices",
            "type": "uint256[5]"
          }
        ],
        "internalType": "struct CreditSale.ListingInfo[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint8",
        "name": "tokenId",
        "type": "uint8"
      }
    ],
    "name": "getTokenPriceUSDC",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getWBTCPriceUSDC",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getWETHPriceUSDC",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "isBlacklisted",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "listingDetails",
    "outputs": [
      {
        "internalType": "address",
        "name": "seller",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "buyer",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "durAmount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "priceUSDC",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "dueDate",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "paymentPeriod",
        "type": "uint256"
      },
      {
        "internalType": "enum CreditSale.ListingStatus",
        "name": "status",
        "type": "uint8"
      },
      {
        "internalType": "bool",
        "name": "isCollateral",
        "type": "bool"
      },
      {
        "internalType": "uint8",
        "name": "collateralMask",
        "type": "uint8"
      },
      {
        "internalType": "uint8",
        "name": "collateralTokenId",
        "type": "uint8"
      },
      {
        "internalType": "uint16",
        "name": "collateralBufferBps",
        "type": "uint16"
      },
      {
        "internalType": "uint40",
        "name": "expiresAt",
        "type": "uint40"
      },
      {
        "internalType": "uint256",
        "name": "collateralAmount",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "listingId",
        "type": "uint256"
      }
    ],
    "name": "makePayment",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "nextListingId",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "pairwiseBL",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "listingId",
        "type": "uint256"
      }
    ],
    "name": "payAfterDefault",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "pendingBuyNoCollateralBL",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "pendingBuyerCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "pendingBuyerListingIds",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "pendingSellerCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "pendingSellerListingIds",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "durRaw",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "priceRaw",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "period",
        "type": "uint256"
      },
      {
        "internalType": "uint8",
        "name": "mask",
        "type": "uint8"
      },
      {
        "internalType": "uint8",
        "name": "chosenToken",
        "type": "uint8"
      },
      {
        "internalType": "uint16",
        "name": "bufferBps",
        "type": "uint16"
      },
      {
        "internalType": "uint40",
        "name": "expiresAt",
        "type": "uint40"
      }
    ],
    "name": "postListingCollateralBuy",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "durRaw",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "priceRaw",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "period",
        "type": "uint256"
      },
      {
        "internalType": "uint8",
        "name": "mask",
        "type": "uint8"
      },
      {
        "internalType": "uint16",
        "name": "bufferBps",
        "type": "uint16"
      },
      {
        "internalType": "uint40",
        "name": "expiresAt",
        "type": "uint40"
      }
    ],
    "name": "postListingCollateralSell",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "durRaw",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "priceRaw",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "period",
        "type": "uint256"
      },
      {
        "internalType": "uint40",
        "name": "expiresAt",
        "type": "uint40"
      }
    ],
    "name": "postListingNoCollateralBuy",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "durRaw",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "priceRaw",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "period",
        "type": "uint256"
      },
      {
        "internalType": "uint40",
        "name": "expiresAt",
        "type": "uint40"
      }
    ],
    "name": "postListingNoCollateralSell",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "priceUSDC",
        "type": "uint256"
      },
      {
        "internalType": "uint8",
        "name": "tokenId",
        "type": "uint8"
      },
      {
        "internalType": "uint16",
        "name": "bufferBps",
        "type": "uint16"
      }
    ],
    "name": "previewCollateral",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "priceUSDC",
        "type": "uint256"
      },
      {
        "internalType": "uint8",
        "name": "tokenId",
        "type": "uint8"
      },
      {
        "internalType": "uint16",
        "name": "bufferBps",
        "type": "uint16"
      }
    ],
    "name": "requiredCollateral",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "priceUSDC",
        "type": "uint256"
      },
      {
        "internalType": "uint8",
        "name": "tokenId",
        "type": "uint8"
      },
      {
        "internalType": "uint256",
        "name": "lockedPrice",
        "type": "uint256"
      },
      {
        "internalType": "uint16",
        "name": "bufferBps",
        "type": "uint16"
      }
    ],
    "name": "requiredCollateralLocked",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "stateView",
    "outputs": [
      {
        "internalType": "contract IStateView",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "totalBL",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "buyer",
        "type": "address"
      }
    ],
    "name": "totalBLLevel",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "unpaidDefaultCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "unpaidNoCollateralDefaultCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "wbtcPoolId",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "wethPoolId",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

export const OP_MAINNET = { chainId: 10, address: CONTRACT_ADDRESS };



export const TOKEN_ADDRESSES = {
  DUR:  "0xf2f471dd1fBD278e54a81af7D5a22E3a38eA43Ff",
  USDC: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
  USDT: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
  BLT:  "0xEac1b253E553E28c48535ed738dAB70204B5D28B",
  WBTC: "0x68f180fcCe6836688e9084f035309E29Bf0A2095",
  WETH: "0x4200000000000000000000000000000000000006",
};

export const TOKEN_IDS = {
  USDC: 0,
  USDT: 1,
  BLT:  2,
  WBTC: 3,
  WETH: 4,
};

export const TOKEN_DECIMALS = {
  USDC: 6,
  USDT: 6,
  BLT:  18,
  WBTC: 8,
  WETH: 18,
};

export const COLLATERAL_TOKENS = ["USDC", "USDT", "BLT", "WBTC", "WETH"];

export const TOKEN_COLORS = {
  USDC: "#2775CA",
  USDT: "#26A17B",
  BLT:  "#8B5CF6",
  WBTC: "#F7931A",
  WETH: "#627EEA",
};

export const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
];

export function maskFromTokens(tokenNames) {
  return tokenNames.reduce((mask, name) => {
    return mask | (1 << TOKEN_IDS[name]);
  }, 0);
}

export function tokensFromMask(mask) {
  return COLLATERAL_TOKENS.filter((name) => mask & (1 << TOKEN_IDS[name]));
}
