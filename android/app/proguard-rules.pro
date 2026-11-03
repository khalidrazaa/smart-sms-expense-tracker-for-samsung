# Production Proguard / R8 Rules for SpendTracker
# Keep Room SQLite schemas and entities
-keep class androidx.room.** { *; }
-keep class com.samsung.spendtracker.data.** { *; }
-dontwarn androidx.room.**

# Keep Kotlin Coroutines
-keepnames class kotlinx.coroutines.** { *; }

# Keep Material & Compose
-keep class androidx.compose.** { *; }

# Keep Model & Receiver classes
-keep class com.samsung.spendtracker.receiver.** { *; }
