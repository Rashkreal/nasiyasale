import React from 'react';
import { TrendingUp, Lock, Shield, Info } from 'lucide-react';
import { useLang } from '../hooks/useLang';

export default function Tokenomics() {
  const { t } = useLang();

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto' }}>
      <div className="page-header">
        <h1 className="page-title">
          <TrendingUp size={24} style={{ marginRight: '10px' }} />
          Tokenomics
        </h1>
        <p className="page-subtitle">
          NasiyaSale ekotizimi va DUR tokeni iqtisodi
        </p>
      </div>

      {/* 1. DUR tokeni */}
      <section className="card" style={{ padding: '24px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.3rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Info size={22} color="var(--accent-bright)" />
          DUR tokeni
        </h2>
        <ul style={{ lineHeight: 1.8, paddingLeft: '20px', color: 'var(--text-secondary)' }}>
          <li><strong>Nomi:</strong> DUR (Durable Utility Reward)</li>
          <li><strong>Manzil:</strong> <code>0xf2f471dd1fBD278e54a81af7D5a22E3a38eA43Ff</code></li>
          <li><strong>Decimals:</strong> 18</li>
          <li><strong>Asosiy foydalanish:</strong> Nasiya savdolarida sotiladigan aktiv. Shuningdek, Vault’da qulflanib, doimiy daromad oqimi yaratiladi.</li>
          <li><strong>Taklif:</strong> Hammasi token yaratuvchilarida; bozorga faqat Vault’ning doimiy emissiya jadvali orqali chiqariladi.</li>
        </ul>
      </section>

      {/* 2. Vault — DUR qulflash va daromad */}
      <section className="card" style={{ padding: '24px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.3rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Lock size={22} color="var(--warning)" />
          Vault — DUR qulflash
        </h2>
        <ul style={{ lineHeight: 1.8, paddingLeft: '20px', color: 'var(--text-secondary)' }}>
          <li><strong>Maqsad:</strong> DUR tokenlarini vaqtli qulflash orqali ekotizimga uzluksiz likvidlik va daromad oqimi berish.</li>
          <li><strong>Qanday ishlaydi:</strong> Foydalanuvchi DUR tokenlarini ma’lum muddatga (1–365 kun) Vault’ga qulflaydi. Qulflangan tokenlar har sekundda ozod qilinadi, ya’ni doimiy daromad oqimi (stream) shaklida qaytariladi.</li>
          <li><strong>Mukofot:</strong> Qulflaganlar qo‘shimcha BL ball oladilar (BL DUR × 10).</li>
          <li><strong>Vault manzili:</strong> <code>0xaB7B9E2d539Bbcd6a8Bde434ab481D192DDC2Ba5</code></li>
        </ul>
      </section>

      {/* 3. Business Level (BL) */}
      <section className="card" style={{ padding: '24px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.3rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield size={22} color="var(--success)" />
          Business Level (BL)
        </h2>
        <ul style={{ lineHeight: 1.8, paddingLeft: '20px', color: 'var(--text-secondary)' }}>
          <li><strong>Nima?</strong> BL — bu on-chain ishonch darajasi. Har bir muvaffaqiyatli to‘lov BL ball keltiradi.</li>
          <li><strong>Qanday to‘planadi?</strong>
            <ul>
              <li>Garovli savdoda: DUR miqdorining 10% i BL sifatida qo‘shiladi.</li>
              <li>Garovsiz savdoda: DUR miqdorining 100% i BL sifatida qo‘shiladi (xavf yuqori).</li>
              <li>Vault’ga DUR qulflash: DUR × 10 BL beradi.</li>
            </ul>
          </li>
          <li><strong>Cheklovlar:</strong> Bitta sotuvchi bilan faol garovsiz qarz BL’ning 10% dan oshmasligi kerak. Bu tizimni xavfsiz saqlaydi.</li>
          <li><strong>Jarima:</strong> To‘lovni o‘z vaqtida bajarmasangiz, o‘sha sotuvchi bilan BL nolga tushadi va qora ro‘yxatga kirasiz. Qora ro‘yxatdan chiqish uchun qarzni USDC da to‘lash kerak (BL qayta tiklanmaydi).</li>
        </ul>
      </section>

      {/* 4. Garov tizimi */}
      <section className="card" style={{ padding: '24px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.3rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Lock size={22} color="var(--info)" />
          Garov (Collateral)
        </h2>
        <ul style={{ lineHeight: 1.8, paddingLeft: '20px', color: 'var(--text-secondary)' }}>
          <li><strong>Qabul qilinadigan tokenlar:</strong> Faqat WBTC va WETH.</li>
          <li><strong>Narx manbai:</strong> Chainlink (L2 Sequencer himoyasi bilan).</li>
          <li><strong>Narx qulflash (snapshot):</strong> E’lon vaqtida narx olinadi va butun savdo davomida o‘zgarmaydi.</li>
          <li><strong>Narx farqi himoyasi:</strong> Tasdiqlashda jonli narx snapshot bilan solishtiriladi; agar farq ruxsat etilgan foizdan oshsa, tranzaksiya rad etiladi (flash‑loan hujumidan himoya).</li>
          <li><strong>Ortiqcha garov:</strong> Sotuvchi faqat qarz miqdoricha garov oladi, qolgani xaridorga qaytariladi (rahn).</li>
        </ul>
      </section>

      {/* 5. Narx manbasi (Oracle) */}
      <section className="card" style={{ padding: '24px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.3rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TrendingUp size={22} color="var(--accent-bright)" />
          Narx manbasi (Oracle)
        </h2>
        <ul style={{ lineHeight: 1.8, paddingLeft: '20px', color: 'var(--text-secondary)' }}>
          <li><strong>Chainlink:</strong> WBTC va ETH narxlari uchun.</li>
          <li><strong>L2 Sequencer himoyasi:</strong> Sequencer ishlamay qolsa, barcha narxga bog‘liq amallar to‘xtatiladi. Tiklangach, 1 soatlik kutish davri.</li>
          <li><strong>Zaxira narx:</strong> Agar Chainlink 48 soatdan ortiq ishlamasa, listingdagi zaxira narx (refreshSnapshot) ishlatiladi.</li>
        </ul>
      </section>
    </div>
  );
}