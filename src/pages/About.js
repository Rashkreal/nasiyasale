import React from 'react';
import { Shield, Zap, TrendingUp, Lock, Users, Info } from 'lucide-react';
import { useLang } from '../hooks/useLang';

export default function About() {
  const { t } = useLang();

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto' }}>
      <div className="page-header">
        <h1 className="page-title">
          <Info size={24} style={{ marginRight: '10px' }} />
          NasiyaSale haqida
        </h1>
        <p className="page-subtitle">
          DUR tokeni uchun markazlashmagan, ownersiz nasiya bozori
        </p>
      </div>

      {/* 1. Umumiy tamoyillar */}
      <section className="card" style={{ padding: '24px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.3rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield size={22} color="var(--accent-bright)" />
          Umumiy tamoyillar
        </h2>
        <ul style={{ lineHeight: 1.8, paddingLeft: '20px', color: 'var(--text-secondary)' }}>
          <li><strong>Ownersiz va o‘zgarmas:</strong> Kontraktda admin, owner yoki upgrade yo‘q. Arbitrum One tarmog‘ida deploy qilingan, hech kim hech qachon o‘zgartira olmaydi. Noto‘g‘ri yuborilgan tokenlarni qaytarib bo‘lmaydi.</li>
          <li><strong>Hammasi ochiq:</strong> Barcha listinglar, narxlar va holatlar zanjirda shaffof. Hech qanday yashirin imtiyoz yo‘q.</li>
          <li><strong>Islomiy tamoyillar:</strong> Garovli savdoda faqat qarz miqdoricha garov olinadi, ortiqchasi xaridorga qaytariladi (rahn). Foiz (ribo) yo‘q, jarima yo‘q.</li>
        </ul>
      </section>

      {/* 2. Garovli savdo */}
      <section className="card" style={{ padding: '24px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.3rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Lock size={22} color="var(--warning)" />
          Garovli savdo
        </h2>
        <ul style={{ lineHeight: 1.8, paddingLeft: '20px', color: 'var(--text-secondary)' }}>
          <li><strong>Garov tokenlari:</strong> Faqat WBTC va WETH qabul qilinadi.</li>
          <li><strong>Kim e'lon bera oladi?</strong> Sotuvchi ham, xaridor ham garovli e'lon joylashi mumkin. Xaridor e'lon vaqtida garovni kontraktga o‘tkazadi. Sotuvchi e'lon vaqtida DUR tokenini kontraktga o'tkazadi.</li>
          <li><strong>Narxlar:</strong> Garov narxi e'lon vaqtida Chainlink orqali olinadi va butun savdo davomida o‘zgarmaydi. So‘nggi 48 soat ichida narx yangilanmagan bo‘lsa, zaxira mexanizmi ishga tushadi.</li>
          <li><strong>To‘lov:</strong> Xaridor USDC bilan istalgan vaqtda to‘lov qilishi mumkin — muddatidan oldin ham, kechikib ham. To‘lov amalga oshgach, garov qaytariladi va xaridor BL ball oladi.</li>
          <li><strong>Default (to‘lov qilinmasa):</strong> Muddati o‘tgan garovli listing uchun <strong>sotuvchi yoki xaridor</strong> “claim” (da'vo) qilishi mumkin. Sotuvchi faqat qarz miqdoricha garov oladi, qolgani xaridorga qaytariladi.</li>
          <li><strong>Qo‘shimcha garov buferi:</strong> E'lon beruvchi garov qiymatini 0–20% gacha oshirib qo‘yishi mumkin, bu narx o‘zgarishidan himoyalaydi.</li>
        </ul>
      </section>

      {/* 3. Garovsiz savdo */}
      <section className="card" style={{ padding: '24px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.3rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={22} color="var(--success)" />
          Garovsiz savdo (BL asosida)
        </h2>
        <ul style={{ lineHeight: 1.8, paddingLeft: '20px', color: 'var(--text-secondary)' }}>
          <li><strong>Business Level (BL):</strong> Garovsiz savdo faqat yetarli BL ballga ega xaridorlar uchun. BL ball vaqt o‘tishi bilan muvaffaqiyatli to‘lovlar orqali yig‘iladi.</li>
          <li><strong>BL hisobi:</strong>
            <ul>
              <li>Garovli savdoda: DUR miqdorining 10% i BL sifatida qo‘shiladi.</li>
              <li>Garovsiz savdoda: DUR miqdorining 100% i BL sifatida qo‘shiladi (yuqori xavf uchun mukofot).</li>
            </ul>
          </li>
          <li><strong>Qanday ishlaydi?</strong> Xaridor garovsiz listing joylaydi va BL band qilinadi. Sotuvchi tasdiqlagach, DUR xaridorga o‘tkaziladi. Xaridor muddatida to‘lov qilsa, BL yana oshadi.</li>
          <li><strong>To‘lov qilinmasa:</strong> Xaridorning sotuvchi bilan bo‘lgan BL nolga tushadi, qora ro‘yxatga kiradi va yangi garovsiz e'lon bera olmaydi. Qora ro‘yxatdan chiqish uchun <strong>Pay After Default</strong> orqali qarzni USDC da to‘lash kerak (BL qayta tiklanmaydi, lekin garovsiz amaliyot qilish imkoniyati qaytadi).</li>
          <li><strong>BL cheklovi:</strong> Bitta sotuvchiga nisbatan umumiy faol garovsiz qarz BL ning 10% idan oshmasligi kerak. Bu xavfni cheklaydi.</li>
        </ul>
      </section>

      {/* 4. Narx farqi himoyasi */}
      <section className="card" style={{ padding: '24px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.3rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TrendingUp size={22} color="var(--info)" />
          Narx farqi himoyasi (anti-flash-loan)
        </h2>
        <ul style={{ lineHeight: 1.8, paddingLeft: '20px', color: 'var(--text-secondary)' }}>
          <li><strong>E'lon beruvchi cheklovi:</strong> Har bir garovli listingda e'lon beruvchi maksimal narx og‘ish foizini belgilaydi (0.01% – 20%). Bu qiymat listing kartasida “chek: X.XX%” ko‘rinishida aks etadi.</li>
          <li><strong>Avtomatik himoya:</strong> Tasdiqlash vaqtida Chainlink'dan olingan jonli narx, e'lon paytidagi narx bilan solishtiriladi. Agar farq belgilangan foizdan oshsa, kontrakt tranzaksiyani avtomatik rad etadi.</li>
          <li><strong>Default chegara:</strong> Agar tomonlardan biri aniq foiz kiritmasa, kontrakt avtomatik 2% cheklovni qo‘llaydi.</li>
          <li><strong>Ikki tomonlama:</strong> Tasdiqlovchi ham o‘z limitini belgilashi mumkin. Ikkala limitdan qaysi biri qattiqroq bo‘lsa, o‘sha amal qiladi.</li>
        </ul>
      </section>

      {/* 5. Oracle */}
      <section className="card" style={{ padding: '24px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.3rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Zap size={22} color="var(--accent-bright)" />
          Narx manbasi (Oracle)
        </h2>
        <ul style={{ lineHeight: 1.8, paddingLeft: '20px', color: 'var(--text-secondary)' }}>
          <li><strong>Chainlink:</strong> Barcha narxlar Arbitrum One tarmog‘idagi Chainlink WBTC/USD va ETH/USD feed'laridan olinadi.</li>
          <li><strong>L2 Sequencer himoyasi:</strong> Agar Arbitrum sequencer'i ishlamay qolsa, barcha narxga bog‘liq amallar to‘xtatiladi. Sequencer tiklangach, 1 soatlik kutish davri mavjud.</li>
          <li><strong>Zaxira narx:</strong> Agar Chainlink uzoq muddat ishlamasa (48 soatdan ko‘proq), listingda saqlangan zaxira narxdan foydalaniladi. Bu narxni har kim yangilab turishi mumkin (refreshSnapshot).</li>
        </ul>
      </section>

      {/* 6. Manzillar — to'liq ro'yxat Tokenomics sahifasida */}
      <section className="card" style={{ padding: '24px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.3rem', marginBottom: '12px' }}>
          Tarmoq va manzillar
        </h2>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '8px' }}>
          NasiyaSale <strong>Arbitrum One</strong> (Chain ID 42161) tarmog‘ida ishlaydi.
          Barcha token va kontrakt manzillari — DUR, USDC, WBTC, WETH, CreditSale va Vault —
          <strong> Tokenomics</strong> sahifasida to‘liq keltirilgan va Arbiscan havolalari bilan tekshirilishi mumkin.
        </p>
      </section>
    </div>
  );
}
