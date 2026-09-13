# Sanoq — Namoz hisoblagichi

Mobilga mos, offline-first namoz sanoq ilovasi. React + Vite + Capacitor + Supabase asosida yaratilgan.

## Ishga tushirish

```bash
npm install
cp .env.example .env.local
# .env.local ichiga Supabase URL va publishable key yozing
npm run dev
```

## Supabase online account

1. Supabase Dashboard → SQL Editor’ni oching.
2. `supabase/migrations/20260913000000_sanoq_online_auth.sql` faylini to‘liq ishga tushiring.
3. `.env.local` ichida quyidagilar bo‘lsin:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your-key
```

Migration quyidagilarni yaratadi:

- real Supabase Auth login/signup;
- server tomonda unique username;
- username orqali login uchun xavfsiz RPC;
- RLS bilan himoyalangan profiles jadvali;
- har bir foydalanuvchi uchun cloud statistics.

Faqat `publishable/anon` key frontend’da ishlatiladi. `sb_secret` yoki service key’ni frontend’ga qo‘ymang va repository’ga commit qilmang.

## Build

```bash
npm run build
npm run preview
```

## Android APK

Android SDK va Java 21 o‘rnatilgan bo‘lishi kerak:

```bash
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
```

APK manzili: `android/app/build/outputs/apk/debug/app-debug.apk`.

## Versiya yangilanishi

Hozirgi versiya `0.0.02`. Account oynasidagi **Versiyani tekshirish** tugmasi GitHub’dagi `public/version.json` faylini tekshiradi. Yangi versiya topilsa, **Yangilash** tugmasi release APK’ni ochadi. Android oxirgi o‘rnatish tasdig‘ini xavfsizlik sabab o‘zi so‘raydi.

## Offline ishlash

Sanoq va oxirgi statistika qurilmada cache qilinadi. Internet bo‘lsa Supabase bilan sinxronlanadi, internet uzilsa ham lokal ma’lumotlar bilan davom etadi.
