# Estate Visitor Management System

## Fixing Expo startup on Windows

If Expo reports `Failed to resolve plugin for module "expo-camera"`, follow `docs/EXPO-CAMERA-FIX.md`. In short, from the project root run:

```powershell
npm install
npx expo install --fix
npx expo install expo-camera expo-secure-store expo-notifications expo-device expo-crypto
npx expo-doctor
npx expo start --clear
```

The project declares `expo-camera` and the matching config plugin. The error normally means the package is not present in `node_modules` or the install is incomplete.

## DTO code style
Backend request DTOs are in `backend/src/dto/`. Their imports, class declarations and per-property validation decorators follow the supplied `CreatePlayerDto` file style.

## Backend note
The API in this archive still uses the `pg` PostgreSQL client and parameterized SQL in its route handlers. It has not yet been converted to Sequelize. The Sequelize conversion must be completed before this is treated as the agreed final ORM architecture.
