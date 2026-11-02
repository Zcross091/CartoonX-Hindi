# CartoonX-Hindi 📺

> Hindi Cartoon & Anime Streaming Platform for Indian Kids, sourced from [Rare Toon India](https://raretoonindia.in/).

[![Android TV APK](https://img.shields.io/badge/Direct_Download-Android_TV_APK_(Signed)-10b981?style=for-the-badge&logo=android&logoColor=white)](https://github.com/Zcross091/CartoonX-Hindi/releases/latest/download/CartoonX-AndroidTV-Signed.apk)
[![Apple TV tvOS](https://img.shields.io/badge/Direct_Download-Apple_TV_tvOS_(ZIP)-007aff?style=for-the-badge&logo=apple&logoColor=white)](https://github.com/Zcross091/CartoonX-Hindi/releases/latest/download/CartoonX-AppleTV-tvOS.zip)
[![Release Latest](https://img.shields.io/github/v/release/Zcross091/CartoonX-Hindi?label=Latest%20TV%20Release&color=f59e0b&style=for-the-badge)](https://github.com/Zcross091/CartoonX-Hindi/releases/tag/latest)

---

## 📥 Direct TV App Downloads (Instant 1-Click)

Clicking any button below instantly downloads the application binary directly to your device without leading to any intermediate GitHub page:

| Platform | Format | Size | Direct Instant Download Link |
| :--- | :--- | :--- | :--- |
| **🤖 Android TV & Google TV** | `.apk` (Signed) | ~5.4 MB | [⬇️ **Download Android TV APK**](https://github.com/Zcross091/CartoonX-Hindi/releases/latest/download/CartoonX-AndroidTV-Signed.apk) |
| **🍏 Apple TV (tvOS 15+)** | `.zip` (App Bundle) | ~3.8 MB | [⬇️ **Download Apple TV App**](https://github.com/Zcross091/CartoonX-Hindi/releases/latest/download/CartoonX-AppleTV-tvOS.zip) |
| **🤖 Android TV (Debug)** | `.apk` | ~5.4 MB | [⬇️ **Download Debug APK**](https://github.com/Zcross091/CartoonX-Hindi/releases/latest/download/CartoonX-AndroidTV-Debug.apk) |
| **🔐 SHA-256 Checksums** | `.txt` | < 1 KB | [📄 **View Checksums**](https://github.com/Zcross091/CartoonX-Hindi/releases/latest/download/checksums.txt) |

> 💡 **In-Place Updates**: The Android TV app is signed with our release keystore. All future updates install automatically in-place without deleting your app, preserving your full watch history and offline downloads!

---

## 🌟 Key Features
- **Curated Hindi Toons**: Doraemon, Shinchan, Pokemon, Bandbudh aur Budbak, Naruto (Hindi), Disney, and animated movies.
- **Child-Friendly TV & Mobile UI**: High-contrast, playful, accessible navigation.
- **Continue Watching & Watch History**: Never lose progress across episodes.
- **In-App Download Manager**: Offline playback for travel without internet connection.
- **Cross-Platform TV Support**: Automated builds for Android TV (Leanback) and Apple TV (tvOS).
- **In-App In-Place Updater**: Automatically detects new releases and updates seamlessly without data loss.

---

## 📺 How to Install on TV

### Android TV / Google TV / Fire TV:
1. Click [Download Android TV APK](https://github.com/Zcross091/CartoonX-Hindi/releases/latest/download/CartoonX-AndroidTV-Signed.apk) above.
2. Transfer `CartoonX-AndroidTV-Signed.apk` to a USB drive or send via the **Send Files to TV** app from Google Play Store.
3. Open the file on your TV and select **Install**.

### Apple TV (tvOS):
1. Click [Download Apple TV App](https://github.com/Zcross091/CartoonX-Hindi/releases/latest/download/CartoonX-AppleTV-tvOS.zip) above.
2. Unzip and deploy using **Xcode** (Window > Devices and Simulators) or **Apple Configurator**.

---

## 🚀 Automated TV Builds (CI/CD)
Whenever commits are pushed to `main`, GitHub Actions automatically compiles and packages TV applications:
- **Android TV (`.apk`)**: Compiled using Android SDK 34 and signed with PKCS12 release keystore.
- **Apple TV (`.zip` / tvOS bundle)**: Compiled via native macOS runner with SwiftUI tvOS target.
- **Automatic GitHub Release**: Triggered automatically via `release.yml` on every successful build to keep the `latest` tag always updated.
