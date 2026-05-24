import React from 'react';
import { FileText, Lock, Coins, Shield, Map, AlertTriangle, ExternalLink, BarChart3 } from 'lucide-react';

// ─── Ma'lumotlar ─────────────────────────────────────────────────────────────
const DUR_ADDRESS    = "0xf2f471dd1fBD278e54a81af7D5a22E3a38eA43Ff";
const CREDITSALE_ADDR = "0xc96A9D80E03BC97EDb7DB189c0bE233aD151F232";
const VAULT_ADDR     = "0xaB7B9E2d539Bbcd6a8Bde434ab481D192DDC2Ba5";

const streamLocks = [
  { amount: "50,000,000 DUR", duration: "10 years", tx: "0x0888f53725f79b6d269bdb27578d0af37d4d1461558fdcb1dc74a835c9fab1ff" },
  { amount: "5,000,000 DUR",  duration: "5 years",  tx: "0xab89c87f424f444324964dab175c4f05af062b63a32140bbeaab7ff2c9fa5759" },
  { amount: "1,000,000 DUR",  duration: "1 year",   tx: "0xc1826b080995c078254fb3446481fa496143cd57b3b5527570f3a879b784fb3d" },
];

const lpLocks = [
  { amount: "1,000,000", duration: "1 year",  tx: "0xa4495a8651773fda363be9a0d4f688d14099041bd6299510d2e28fab40411425" },
  { amount: "2,000,000", duration: "2 years", tx: "0x8cb4b575c863639b8cf596ec33c6442a29c82c3fdae185acb5ff01202ae01294" },
  { amount: "3,000,000", duration: "3 years", tx: "0xd1df6ebc5504ed1b63e82d95f876cb9c6bf93709ea6d8c6daadc996b7d73b4b5" },
  { amount: "4,000,000", duration: "4 years", tx: "0x1849f4cce69fce149af5003eb119cb41e372bd508595267103a5b6b7b9801d52" },
];

const allocation = [
  { label: "Streaming locks",   amount: "56,000,000", share: "56%", note: "Locked in Vault, releases linearly over 1–10 years" },
  { label: "Locked liquidity",  amount: "10,000,000", share: "10%", note: "LP locked 1–4 years" },
  { label: "Active liquidity",  amount: "10,000,000", share: "10%", note: "Provided in Uniswap pool for open trading" },
  { label: "Free / circulating",amount: "24,000,000", share: "24%", note: "Available for trading" },
];

const short = (a) => a.slice(0, 8) + "…" + a.slice(-6);
const txUrl = (h) => "https://optimistic.etherscan.io/tx/" + h;
const addrUrl = (a) => "https://optimistic.etherscan.io/address/" + a;

const wpStyles = `
.wp-wrap { max-width: 880px; margin: 0 auto; font-family: var(--font-sans, "DM Sans", sans-serif); line-height: 1.7; }
.wp-hero { text-align: center; padding: 32px 0 24px; border-bottom: 1px solid var(--border, #2a3040); margin-bottom: 32px; }
.wp-hero h1 { font-size: 34px; font-weight: 800; letter-spacing: -0.5px; margin: 12px 0 6px; }
.wp-hero .wp-sub { color: var(--text-secondary, #8892a8); font-size: 14px; }
.wp-section { margin-bottom: 36px; }
.wp-section h2 {
  font-size: 20px; font-weight: 700; margin-bottom: 14px;
  display: flex; align-items: center; gap: 10px;
}
.wp-section h3 { font-size: 15px; font-weight: 700; margin: 18px 0 8px; color: var(--text-primary, #e8edf5); }
.wp-section p { color: var(--text-secondary, #8892a8); margin-bottom: 12px; }
.wp-note {
  background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.25);
  border-radius: 10px; padding: 14px 16px; margin: 14px 0;
  font-size: 13px; color: var(--text-secondary, #8892a8);
}
.wp-note strong { color: var(--warning, #f59e0b); }
.wp-table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px; }
.wp-table th, .wp-table td {
  text-align: left; padding: 9px 12px; border-bottom: 1px solid var(--border, #2a3040);
}
.wp-table th { color: var(--text-muted, #4a5568); font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; }
.wp-table td { color: var(--text-secondary, #8892a8); }
.wp-table td.mono, .wp-table a.mono { font-family: 'JetBrains Mono', monospace; font-size: 12px; }
.wp-addr {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: 'JetBrains Mono', monospace; font-size: 12px;
  color: var(--accent, #00d4aa); text-decoration: none;
}
.wp-addr:hover { text-decoration: underline; }
.wp-list { color: var(--text-secondary, #8892a8); padding-left: 20px; margin-bottom: 12px; }
.wp-list li { margin-bottom: 6px; }
.wp-disclaimer {
  background: var(--bg-card, #1a1f2e); border: 1px solid var(--border, #2a3040);
  border-radius: 12px; padding: 18px 20px; font-size: 13px; color: var(--text-secondary, #8892a8);
}
.wp-disclaimer li { margin-bottom: 8px; }
.wp-icon { color: var(--accent, #00d4aa); flex-shrink: 0; }
`;

export default function Whitepaper() {
  return (
    <>
      <style>{wpStyles}</style>
      <div className="wp-wrap">

        <div className="wp-hero">
          <FileText size={40} className="wp-icon" style={{ margin: "0 auto" }} />
          <h1>NasiyaSale Whitepaper</h1>
          <div className="wp-sub">Version 1.0 · 2026 · Optimism Mainnet</div>
        </div>

        {/* 1. Introduction */}
        <div className="wp-section">
          <h2><FileText size={20} className="wp-icon" /> 1. Introduction</h2>
          <p>
            NasiyaSale is a decentralized platform for buying and selling the DUR token on a
            deferred-payment ("nasiya") basis. All trades are executed through autonomous smart
            contracts on Optimism Mainnet, with no intermediary, custodian, or administrator
            controlling user funds.
          </p>
          <p>
            The project is inspired by the principle of interest-free (riba-free) trade. Instead of
            lending money at interest, NasiyaSale lets people transact with one another through
            deferred-payment sales — a structure rooted in traditional commerce and in Islamic
            finance principles. The goal is twofold: to bring local installment-based trade (common
            in Uzbekistan and the region) onto a transparent blockchain, and to demonstrate that
            cryptocurrency can be used in a way that aligns with interest-free commercial principles.
          </p>
          <div className="wp-note">
            <strong>Note on compliance:</strong> NasiyaSale is <em>designed to align</em> with
            interest-free trade principles. It has <strong>not</strong> yet received formal
            certification from an Islamic finance scholar or Sharia board. Such certification is
            planned (see Roadmap). Until then, no claim of formal Sharia compliance is made.
          </div>
        </div>

        {/* 2. The Problem */}
        <div className="wp-section">
          <h2><AlertTriangle size={20} className="wp-icon" /> 2. The Problem</h2>
          <p>
            Conventional lending relies on interest (riba), which a significant part of the world —
            and the global Muslim community in particular — considers impermissible. People who wish
            to avoid interest have limited options for credit-based commerce, especially on-chain.
          </p>
          <p>
            At the same time, traditional installment trade in regions like Uzbekistan happens
            informally, based on personal trust, with no transparent record and no protection if one
            side fails to pay.
          </p>
          <p>
            NasiyaSale addresses both: it provides a transparent, rule-based, interest-free way to
            trade on credit, where the terms are enforced by code rather than by a middleman.
          </p>
        </div>

        {/* 3. How it works */}
        <div className="wp-section">
          <h2><Coins size={20} className="wp-icon" /> 3. How NasiyaSale Works</h2>
          <p>
            NasiyaSale facilitates deferred-payment sales of the DUR token. A seller offers DUR; a
            buyer agrees to receive it now and pay later, under terms enforced by the smart contract.
            Only DUR is traded on the platform; other tokens are used solely as collateral or payment.
          </p>

          <h3>3.1 Listing types</h3>
          <table className="wp-table">
            <thead><tr><th>Type</th><th>Creator</th><th>Collateral</th></tr></thead>
            <tbody>
              <tr><td>Seller – Collateral</td><td>Seller (provides DUR)</td><td>Buyer provides</td></tr>
              <tr><td>Buyer – Collateral</td><td>Buyer (provides collateral)</td><td>At listing time</td></tr>
              <tr><td>Seller – No Collateral</td><td>Seller (provides DUR)</td><td>None (requires BL)</td></tr>
              <tr><td>Buyer – No Collateral</td><td>Buyer</td><td>None (requires BL)</td></tr>
            </tbody>
          </table>

          <h3>3.2 Business Level (BL) — a trust system</h3>
          <p>
            Because no-collateral trades carry more risk, the contract tracks a Business Level (BL)
            for each address — an on-chain reputation earned by completing trades honestly:
          </p>
          <ul className="wp-list">
            <li>A collateralized deal paid in full: BL increases by (DUR amount ÷ 10)</li>
            <li>A no-collateral deal paid in full: BL increases by the full DUR amount</li>
            <li>A deal left unpaid: BL resets to 0</li>
            <li>To create a no-collateral listing: BL must be at least 10× the listing's DUR amount</li>
          </ul>
          <p>Trust is built gradually, on-chain, and is lost immediately if obligations are not met.</p>

          <h3>3.3 Collateral system</h3>
          <ul className="wp-list">
            <li>Accepted collateral: USDC, USDT, BLT, WBTC, WETH</li>
            <li>Collateral prices are snapshotted to protect against flash-loan manipulation</li>
            <li>Payments are made in USDC directly to the seller — the contract never custodies payment</li>
          </ul>

          <h3>3.4 Autonomy</h3>
          <p>
            The NasiyaSale contract is autonomous. It has no admin or owner function that can seize
            funds, alter balances, or change the rules after deployment.
          </p>
          <a className="wp-addr" href={addrUrl(CREDITSALE_ADDR)} target="_blank" rel="noreferrer">
            {short(CREDITSALE_ADDR)} <ExternalLink size={12} />
          </a>
        </div>

        {/* 4. DUR Token */}
        <div className="wp-section">
          <h2><Coins size={20} className="wp-icon" /> 4. The DUR Token</h2>
          <p>DUR (Durvodik) is the single asset traded on NasiyaSale. Its contract is intentionally minimal.</p>
          <ul className="wp-list">
            <li>Address: <a className="wp-addr" href={addrUrl(DUR_ADDRESS)} target="_blank" rel="noreferrer">{short(DUR_ADDRESS)} <ExternalLink size={12} /></a></li>
            <li>Standard: OpenZeppelin ERC-20 (unmodified)</li>
            <li>Total supply: 100,000,000 DUR (fixed)</li>
            <li>Price: approximately $0.01 (live Uniswap V4 market price)</li>
          </ul>
          <p>The verified on-chain source is a standard OpenZeppelin ERC-20 with a one-time mint in the constructor. There is:</p>
          <ul className="wp-list">
            <li><strong>No mint function</strong> after deployment — supply is permanently fixed</li>
            <li><strong>No owner / no admin</strong> — the contract has no privileged roles</li>
            <li><strong>No pause, blacklist, or transfer tax</strong> — no mechanism that could block selling</li>
          </ul>
          <p>
            Because all transfer logic is the unmodified OpenZeppelin standard, the token is
            technically incapable of behaving as a honeypot.
          </p>
        </div>

        {/* 5. Tokenomics */}
        <div className="wp-section">
          <h2><BarChart3 size={20} className="wp-icon" /> 5. Tokenomics</h2>
          <p>Total DUR supply: <strong>100,000,000</strong> (fixed, no further minting possible).</p>
          <table className="wp-table">
            <thead><tr><th>Allocation</th><th>Amount</th><th>Share</th><th>Status</th></tr></thead>
            <tbody>
              {allocation.map((a) => (
                <tr key={a.label}>
                  <td style={{ color: "var(--text-primary)" }}>{a.label}</td>
                  <td className="mono">{a.amount}</td>
                  <td className="mono" style={{ color: "var(--accent)" }}>{a.share}</td>
                  <td>{a.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="wp-list">
            <li><strong>No airdrop or free distribution.</strong> Anyone who wants DUR buys it on the open Uniswap market.</li>
            <li><strong>Price grows only through trading.</strong> There is no artificial price mechanism.</li>
            <li>All locks are verifiable on-chain (see below).</li>
          </ul>
          <div className="wp-note">
            BLT is a separate token used only as collateral on the platform. It is not part of DUR
            tokenomics and is not described as locked in this document.
          </div>
        </div>

        {/* 6. Security & Locks */}
        <div className="wp-section">
          <h2><Shield size={20} className="wp-icon" /> 6. Security &amp; Locks</h2>
          <p>
            To reduce supply concentration and demonstrate long-term commitment, 56% of total DUR
            supply has been placed in non-cancellable streaming locks, and liquidity has been locked.
            All actions are verifiable on Optimism Mainnet.
          </p>

          <h3>6.1 DUR supply streaming locks (56,000,000 DUR)</h3>
          <table className="wp-table">
            <thead><tr><th>Amount</th><th>Duration</th><th>Transaction</th></tr></thead>
            <tbody>
              {streamLocks.map((l) => (
                <tr key={l.tx}>
                  <td className="mono">{l.amount}</td>
                  <td>{l.duration}</td>
                  <td><a className="wp-addr" href={txUrl(l.tx)} target="_blank" rel="noreferrer">{l.tx.slice(0,10)}… <ExternalLink size={12} /></a></td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3>6.2 Locked liquidity (10,000,000)</h3>
          <table className="wp-table">
            <thead><tr><th>Amount</th><th>Duration</th><th>Transaction</th></tr></thead>
            <tbody>
              {lpLocks.map((l) => (
                <tr key={l.tx}>
                  <td className="mono">{l.amount}</td>
                  <td>{l.duration}</td>
                  <td><a className="wp-addr" href={txUrl(l.tx)} target="_blank" rel="noreferrer">{l.tx.slice(0,10)}… <ExternalLink size={12} /></a></td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3>6.3 The Vault contract</h3>
          <ul className="wp-list">
            <li>Address: <a className="wp-addr" href={addrUrl(VAULT_ADDR)} target="_blank" rel="noreferrer">{short(VAULT_ADDR)} <ExternalLink size={12} /></a></li>
            <li>Streaming locks release linearly over time and cannot be cancelled once created.</li>
            <li>An emergency-withdraw path exists only 48 hours after a lock's unlock time.</li>
            <li>Lock status is publicly visible on the Vault page of this site.</li>
          </ul>
        </div>

        {/* 7. Roadmap */}
        <div className="wp-section">
          <h2><Map size={20} className="wp-icon" /> 7. Roadmap</h2>
          <p>The following are planned directions, not guarantees:</p>
          <ul className="wp-list">
            <li><strong>Independent security audit.</strong> The more complex contracts (NasiyaSale and Vault) are intended to undergo professional third-party audit before any wider public launch.</li>
            <li><strong>Islamic finance review.</strong> Seek formal review and, if granted, certification from a qualified Islamic finance scholar or board regarding the interest-free trade model.</li>
            <li><strong>Multi-chain expansion.</strong> Explore deploying the contracts on additional networks (e.g. Arbitrum), with network-specific parameters.</li>
            <li><strong>Continued decentralization.</strong> Further distribute DUR over time so that supply is held more widely.</li>
          </ul>
        </div>

        {/* 8. Disclaimer */}
        <div className="wp-section">
          <h2><AlertTriangle size={20} className="wp-icon" /> 8. Disclaimer</h2>
          <div className="wp-disclaimer">
            <ul style={{ paddingLeft: 18, margin: 0 }}>
              <li>This document is informational and does not constitute financial, legal, or religious advice.</li>
              <li>DUR has no guaranteed value. Its price is determined entirely by the open market and may go down as well as up.</li>
              <li>The smart contracts have not yet been independently audited at the time of writing. Users interact with them at their own risk.</li>
              <li>NasiyaSale is not yet certified as Sharia-compliant; such review is planned but not complete.</li>
              <li>Cryptocurrency regulations vary by country. Users are responsible for complying with the laws of their own jurisdiction.</li>
            </ul>
          </div>
        </div>

        <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-muted, #4a5568)", fontSize: 12, borderTop: "1px solid var(--border, #2a3040)" }}>
          NasiyaSale · Optimism Mainnet · nasiyasale.vercel.app
        </div>

      </div>
    </>
  );
}
