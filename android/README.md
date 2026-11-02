# Samsung Galaxy A57 SpendTracker (Native Android App)

This is the **Native Android (Kotlin / Jetpack Compose)** version of SpendTracker, engineered to automatically read bank SMS messages in the background with zero copy-pasting.

---

## Key Features

1. **Automatic Background SMS Interception (`SmsReceiver.kt`)**:
   - Listens to the Android OS broadcast `android.provider.Telephony.SMS_RECEIVED`.
   - Whenever your bank sends an SMS (HDFC, SBI, ICICI, Axis, Kotak, UPI, etc.), the app wakes up in the background, extracts the debited/credited amount and merchant name, and saves it into your local database.
   - Zero copy-pasting required.

2. **Local Room SQLite Database (`AppDatabase.kt`)**:
   - Stores all your transactions on-device with zero external cloud dependencies.
   - Tracks Net Balance (`Total Credits - Total Debits`), Total Debits, Total Credits, and Cash Spendings.

3. **Manual Cash Expense Entry**:
   - Floating Action Button `(+)` opens a dialog to log physical cash spendings (groceries, auto-rickshaw, street food, etc.).

4. **One UI & AMOLED Dark Theme**:
   - Designed specifically for Samsung Galaxy Super AMOLED screens.

---

## How to Build the `.apk` in Android Studio

1. **Open the Project**:
   - Download or clone the `/android` folder.
   - Open **Android Studio** (Ladybug or newer).
   - Select **Open an existing Android Studio project** and select the `/android` folder.

2. **Build the APK**:
   - In Android Studio, go to the top menu:
     **Build** &rarr; **Build Bundle(s) / APK(s)** &rarr; **Build APK(s)**.
   - Once compilation finishes (usually 1 minute), a notification appears: *"APK(s) generated successfully"*.
   - Click **"locate"** to find `app-debug.apk`.

3. **Install on Your Samsung Galaxy A57**:
   - Send `app-debug.apk` to your phone via **Samsung Quick Share**, **USB Cable**, or **Google Drive**.
   - Tap `app-debug.apk` on your Samsung A57 and tap **Install**.
   - When you first open the app, tap **"Allow"** when prompted for SMS permission (`RECEIVE_SMS`).

Done! From that point forward, every bank transaction SMS you receive will be automatically detected and added to your ledger.
