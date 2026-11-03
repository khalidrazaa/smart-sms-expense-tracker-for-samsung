# Samsung SpendTracker - Production Release & Keystore Guide

## 1. Keystore Details

The production signing keystore has been generated and configured:

| Property | Value |
| :--- | :--- |
| **Keystore File** | `android/keystore/release.keystore` & `android/app/release.keystore` |
| **Keystore Type** | PKCS12 (Java / Android Standard) |
| **Key Alias** | `release_key` |
| **Store Password** | `spendtracker123` |
| **Key Password** | `spendtracker123` |
| **Validity** | 10,000 Days (Valid until year 2054) |
| **Algorithm** | RSA 2048-bit |

The configuration is loaded automatically by Gradle from `android/keystore.properties`.

---

## 2. How to Build the Production Release APK

### Option A: Via GitHub Actions (Zero Setup Cloud Build)
1. Push this repository to GitHub.
2. Go to the **Actions** tab on GitHub -> click **Build Samsung SpendTracker APK**.
3. Once the build completes (~2 minutes), scroll to **Artifacts** at the bottom.
4. Download **`SpendTracker-Samsung-A57-Production-Release-APK`**.
5. Inside the zip is the signed, production-ready `app-release.apk`!

### Option B: In Android Studio
1. Open the `android` folder in Android Studio.
2. Go to top menu: **Build** > **Generate Signed App Bundle / APK...**
3. Select **APK** and click **Next**.
4. Key store path: browse and select `android/app/release.keystore`.
5. Enter:
   - Key store password: `spendtracker123`
   - Key alias: `release_key`
   - Key password: `spendtracker123`
6. Click **Next** -> select **release** -> click **Finish**.
7. The signed APK will be generated in `android/app/release/app-release.apk`.

### Option C: Via Command Line (Terminal / PowerShell)
In the `android/` directory:
- **Windows**:
  ```bat
  gradlew.bat assembleRelease
  ```
- **Mac / Linux**:
  ```bash
  ./gradlew assembleRelease
  ```
Output file: `android/app/build/outputs/apk/release/app-release.apk`.
