package com.samsung.spendtracker

import android.app.Application
import com.samsung.spendtracker.data.AppDatabase

class SpendTrackerApp : Application() {
    val database: AppDatabase by lazy { AppDatabase.getDatabase(this) }

    override fun onCreate() {
        super.onCreate()
        instance = this
    }

    companion object {
        lateinit var instance: SpendTrackerApp
            private set
    }
}
