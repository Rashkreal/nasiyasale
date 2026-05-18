const fs = require("fs");

const abi = JSON.parse(fs.readFileSync("new-abi.json", "utf8"));

const out = `
export const CONTRACT_ADDRESS = "0xc96A9D80E03BC97EDb7DB189c0bE233aD151F232";

export const CONTRACT_ABI = ${JSON.stringify(abi, null, 2)};
`;

fs.writeFileSync("src/abi/contract.js", out);

console.log("✅ ABI updated");
