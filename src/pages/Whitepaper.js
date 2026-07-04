import React from 'react';
import { FileText, Lock, Coins, Shield, Map, AlertTriangle, ExternalLink, BarChart3 } from 'lucide-react';

// ─── Ma'lumotlar (Arbitrum One, zanjirdan tasdiqlangan) ──────────────────────
const DUR_ADDRESS     = "0x92E1EbD0Cfac092047AB4a69B6E6a8ECA0687e26";
const CREDITSALE_ADDR = "0x61a011ca9a21Ec4073fA7E20448cbec86958B182";
const VAULT_ADDR      = "0x334ABa8643C7B7C97d5CeF5b73991e2af7D43462";

// Likvidlik strategiyasi — diapazonlar (1–5 rejalashtirilgan, 6–10 proyeksiya).
// Har bir diapazon narxni 2x oshiradi, ~7,000 USDC, DUR har safar ~yarmiga kamayadi.
const liquidityRanges = [
  { n: 1,  range: "$0.01 → $0.02",  dur: "448,100", usdc: "7,400", kind: "planned" },
  { n: 2,  range: "$0.02 → $0.04",  dur: "249,500", usdc: "7,000", kind: "planned" },
  { n: 3,  range: "$0.04 → $0.08",  dur: "125,000", usdc: "7,000", kind: "planned" },
  { n: 4,  range: "$0.08 → $0.16",  dur: "62,700",  usdc: "7,000", kind: "planned" },
  { n: 5,  range: "$0.16 → $0.32",  dur: "31,100",  usdc: "7,000", kind: "planned" },
  { n: 6,  range: "$0.32 → $0.64",  dur: "15,550",  usdc: "7,000", kind: "projected" },
  { n: 7,  range: "$0.64 → $1.28",  dur: "7,775",   usdc: "7,000", kind: "projected" },
  { n: 8,  range: "$1.28 → $2.56",  dur: "3,888",   usdc: "7,000", kind: "projected" },
  { n: 9,  range: "$2.56 → $5.12",  dur: "1,944",   usdc: "7,000", kind: "projected" },
  { n: 10, range: "$5.12 → $10.24", dur: "972",     usdc: "7,000", kind: "projected" },
];

const short  = (a) => a.slice(0, 8) + "…" + a.slice(-6);
const addrUrl = (a) => "https://arbiscan.io/address/" + a;

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
.wp-table td.mono { font-family: 'JetBrains Mono', monospace; font-size: 12px; }
.wp-addr {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: 'JetBrains Mono', monospace; font-size: 12px;
  color: var(--accent, #00d4aa); text-decoration: none;
}
.wp-addr:hover { text-decoration: underline; }
.wp-list { color: var(--text-secondary, #8892a8); padding-left: 20px; margin-bottom: 12px; }
.wp-list li { margin-bottom: 6px; }
.wp-pending {
  display: inline-block; font-size: 11px; font-weight: 600;
  color: var(--warning, #f59e0b); background: rgba(245,158,11,0.1);
  border: 1px solid rgba(245,158,11,0.25); border-radius: 999px; padding: 2px 8px;
}
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
          <div className="wp-sub">Version 1.0 · 2026 · Arbitrum One</div>
        </div>

        {/* 1. Introduction */}
        <div className="wp-section">
          <h2><FileText size={20} className="wp-icon" /> 1. Introduction</h2>
          <p>
            NasiyaSale is a decentralized platform for buying and selling the DUR token on a
            deferred-payment ("nasiya") basis. All trades are executed through autonomous smart
            contracts on Arbitrum One, with no intermediary, custodian, or administrator
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
            <li>Accepted collateral: WBTC and WETH</li>
            <li>Collateral prices are read from Chainlink and snapshotted at listing time to protect against flash-loan manipulation</li>
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
          <ul className="wp-list">
            <li><strong>No airdrop or free distribution.</strong> Anyone who wants DUR buys it on the open Uniswap market.</li>
            <li><strong>Price grows only through trading.</strong> There is no artificial price mechanism.</li>
            <li>95% of supply (95,000,000 DUR) is locked in three non-cancellable Vault streams — 15,000,000 DUR vesting between years 2 and 3, 30,000,000 DUR vesting between years 3 and 5, and 50,000,000 DUR vesting between years 5 and 10 — verifiable on-chain (see Security &amp; Locks).</li>
          </ul>
          <div className="wp-note">
            Confirmed breakdown: 95% locked in Vault streams (see Security &amp; Locks for the
            on-chain transactions), with the remaining 5,000,000 DUR (5%) covering liquidity
            seeding and free float.
          </div>
        </div>

        {/* 6. Liquidity Strategy */}
        <div className="wp-section">
          <h2><BarChart3 size={20} className="wp-icon" /> 6. Liquidity Strategy</h2>
          <p>
            DUR/USDC liquidity is seeded gradually using concentrated Uniswap V4 positions.
            Liquidity is added range by range; each range spans a price doubling and is split
            into 10 segments; each segment moves the price a few percent, such that a roughly $100 trade shifts the price by about 1%.
          </p>
          <ul className="wp-list">
            <li>Each range is filled with approximately <strong>7,000 USDC</strong> (the first range ~7,400).</li>
            <li>As the price rises, the DUR placed in each successive range roughly <strong>halves</strong>, because the same USDC buys less DUR at a higher price.</li>
            <li>The goal is orderly, gradual price discovery — no sudden spikes or dumps.</li>
          </ul>
          <table className="wp-table">
            <thead><tr><th>Range</th><th>Price band</th><th>DUR (~)</th><th>USDC (~)</th><th>Status</th></tr></thead>
            <tbody>
              {liquidityRanges.map((r) => (
                <tr key={r.n}>
                  <td className="mono">{r.n}</td>
                  <td className="mono">{r.range}</td>
                  <td className="mono">{r.dur}</td>
                  <td className="mono">{r.usdc}</td>
                  <td>
                    <span className="wp-pending" style={r.kind === "projected" ? { color: "var(--text-muted, #4a5568)", background: "rgba(120,130,150,0.1)", borderColor: "var(--border, #2a3040)" } : {}}>
                      {r.kind === "planned" ? "Planned" : "Projected"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>
            Ranges 1–5 are the concrete seeding plan; ranges 6–10 are a projection of the same
            rule (price doubling, ~7,000 USDC per range, DUR halving). Through range 10 this seeds
            roughly <strong>946,500 DUR</strong> (~0.95% of total supply) paired with about
            <strong> 70,400 USDC</strong>, carrying the price from $0.01 toward ~$10.
          </p>
          <div className="wp-note">
            This seeding is a bootstrap mechanism, not a permanent price control. The cycle can
            continue into further ranges, but each new range needs progressively less DUR. Planned
            seeding stops once organic, community-supplied liquidity is deep enough for the open
            market to set the DUR price on its own.
          </div>
        </div>

        {/* 7. Security & Locks */}
        <div className="wp-section">
          <h2><Shield size={20} className="wp-icon" /> 7. Security &amp; Locks</h2>
          <p>
            NasiyaSale uses a dedicated Vault contract to lock tokens and liquidity for fixed terms,
            reducing supply concentration and demonstrating long-term commitment. Any lock placed in
            the Vault is publicly verifiable on Arbitrum One.
          </p>

          <div className="wp-note">
            <strong>Status:</strong> Three supply locks totalling 95,000,000 DUR (95% of supply) have
            been executed on Arbitrum One and are listed below with their transaction links.
            Additional locks, if any, will be appended here once executed.
          </div>

          <h3>7.1 The Vault contract</h3>
          <ul className="wp-list">
            <li>Address: <a className="wp-addr" href={addrUrl(VAULT_ADDR)} target="_blank" rel="noreferrer">{short(VAULT_ADDR)} <ExternalLink size={12} /></a></li>
            <li>Streaming locks release linearly over time and cannot be cancelled once created. An optional cliff lets a lock release nothing until a chosen start date, then vest linearly to its end date.</li>
            <li>Fixed-term locks hold tokens until a chosen unlock time, after which they can be withdrawn.</li>
            <li>An emergency-withdraw path exists only 48 hours after a lock's unlock time.</li>
            <li>Lock status is publicly visible on the Vault page of this site.</li>
          </ul>

          <h3>7.2 Executed locks</h3>
          <ul className="wp-list">
            <li>
              <strong>15,000,000 DUR (15% of total supply) — streaming lock with a 2-year cliff.</strong>{' '}
              Nothing unlocks before 3 July 2028; the locked amount then vests linearly until
              3 July 2029 — ending exactly when the 30M lock's cliff opens, extending the
              continuous release schedule one step earlier.{' '}
              <a className="wp-addr" href="https://arbiscan.io/tx/0x792897db1db0b9627d77fd4565329b5ba98e05350993d3948a5da88ddee88410" target="_blank" rel="noreferrer">
                Deposit transaction <ExternalLink size={12} />
              </a>
            </li>
            <li>
              <strong>30,000,000 DUR (30% of total supply) — streaming lock with a 3-year cliff.</strong>{' '}
              Nothing unlocks before 2 July 2029; the locked amount then vests linearly until
              2 July 2031 — ending exactly when the 50M lock's cliff opens, so the two locks form
              one continuous, gradually decreasing release schedule.{' '}
              <a className="wp-addr" href="https://arbiscan.io/tx/0x458fcc0e61186a3d66e1b23ccbdb5b576065864400e98655580c4c4508b5f229" target="_blank" rel="noreferrer">
                Deposit transaction <ExternalLink size={12} />
              </a>
            </li>
            <li>
              <strong>50,000,000 DUR (50% of total supply) — streaming lock with a 5-year cliff.</strong>{' '}
              Nothing unlocks before 2 July 2031; the locked amount then vests linearly until
              30 June 2036. The stream cannot be cancelled, and even the emergency path only opens
              48 hours after the end date — the tokens are provably out of circulation for the
              full term.{' '}
              <a className="wp-addr" href="https://arbiscan.io/tx/0xa3c81c00229dbd1eed74447218c32c052286fde65b50dfbaabd1b8deef0d0339" target="_blank" rel="noreferrer">
                Deposit transaction <ExternalLink size={12} />
              </a>
            </li>
          </ul>
        </div>

        {/* 8. Roadmap */}
        <div className="wp-section">
          <h2><Map size={20} className="wp-icon" /> 8. Roadmap</h2>
          <p>The following are planned directions, not guarantees:</p>
          <ul className="wp-list">
            <li><strong>Finalize and execute supply &amp; liquidity locks.</strong> Set the supply breakdown, place the locks on Arbitrum One, and publish their transaction links here.</li>
            <li><strong>Independent security audit.</strong> The more complex contracts (NasiyaSale and Vault) are intended to undergo professional third-party audit before any wider public launch.</li>
            <li><strong>Islamic finance review.</strong> Seek formal review and, if granted, certification from a qualified Islamic finance scholar or board regarding the interest-free trade model.</li>
            <li><strong>Continued decentralization.</strong> Further distribute DUR over time so that supply is held more widely.</li>
          </ul>
        </div>

        {/* 9. Disclaimer */}
        <div className="wp-section">
          <h2><AlertTriangle size={20} className="wp-icon" /> 9. Disclaimer</h2>
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
          NasiyaSale · Arbitrum One · nasiyasale.vercel.app
        </div>

      </div>
    </>
  );
}
