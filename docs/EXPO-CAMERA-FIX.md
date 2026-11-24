# Fix: PluginError — Failed to resolve plugin "expo-camera"

## Why this happened
The Expo config references `expo-camera` as a config plugin. Expo can only load that plugin when the package is installed in this project's `node_modules`. The dependency is declared in `package.json`, but a package declaration alone does not install it. A stale or incomplete `node_modules` folder can therefore cause this error.

## Windows PowerShell repair
Run these commands from the project root (`C:\Users\king James\estate-visitor-management`):

```powershell
# Stop Expo first with Ctrl+C
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue
npm install
npx expo install --fix
npx expo install expo-camera expo-secure-store expo-notifications expo-device expo-crypto
npx expo-doctor
npx expo start --clear
```

If PowerShell says a file is in use, close VS Code terminals running Node/Expo and retry.

## Important
- Do not install `expo-barcode-scanner`; QR/barcode scanning is supported by `expo-camera` through `CameraView` and `onBarcodeScanned`.
- Keep `expo-camera` in `dependencies` and its config plugin in `app.json`.
- Run `npx expo install`, not plain `npm install expo-camera`, so Expo selects a version compatible with the installed Expo SDK.
- If the project is copied to another computer, run `npm install` there too. `node_modules` is not included in the ZIP.
