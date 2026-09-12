# Sanoq — Namoz hisoblagichi

Oflayn ishlaydigan, mobilga mos namoz sanoq ilovasi. React + Vite asosida yaratilgan.

## Ishga tushirish

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

Build qilingan ilova `dist/` ichida bo‘ladi. Brauzer menyusidan **Install app** orqali telefon yoki kompyuterga o‘rnatiladi. Android uchun Capacitor wrapper ham qo‘shilgan.

## Android APK

APK olish uchun Android SDK va Java 21 o‘rnatilgan bo‘lishi kerak:

```bash
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
```

APK manzili: `android/app/build/outputs/apk/debug/app-debug.apk`.

Ilova ishga tushgach, barcha hisoblar shu qurilmaning local storage xotirasida saqlanadi va internet bo‘lmasa ham ishlaydi.

## Muhim

Bu hozircha backend’siz local-first versiya: akkaunt, username va sanoqlar faqat foydalanilayotgan qurilmada saqlanadi. Haqiqiy serverlararo akkaunt sinxronizatsiyasi uchun keyinroq backend ulash mumkin.
