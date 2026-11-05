package com.samsung.spendtracker.receiver

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Telephony
import androidx.core.app.NotificationCompat
import com.samsung.spendtracker.SpendTrackerApp
import com.samsung.spendtracker.data.TransactionType
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class SmsReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return

        val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
        if (messages.isNullOrEmpty()) return

        val fullBodyBuilder = StringBuilder()
        var timestamp = System.currentTimeMillis()

        for (sms in messages) {
            fullBodyBuilder.append(sms.messageBody)
            timestamp = sms.timestampMillis
        }

        val fullBody = fullBodyBuilder.toString()

        // Parse SMS for financial debit or credit
        val transaction = SmsParser.parse(fullBody, timestamp) ?: return

        // Save automatically to Room SQLite database in the background
        val db = com.samsung.spendtracker.data.AppDatabase.getDatabase(context)
        CoroutineScope(Dispatchers.IO).launch {
            val dao = db.transactionDao()

            // 1. Reference ID deduplication check
            if (transaction.referenceId != null) {
                val exists = dao.countByReferenceId(transaction.referenceId)
                if (exists > 0) return@launch
            }

            // 2. Exact Raw SMS text deduplication check
            val rawExists = dao.countByRawSms(fullBody)
            if (rawExists > 0) return@launch

            // 3. Temporal deduplication window (catches 2-3 duplicate SMS arriving within 3 minutes)
            val recentDuplicate = dao.findRecentDuplicate(
                type = transaction.type,
                amount = transaction.amount,
                timestamp = transaction.timestamp,
                windowMs = 180_000L // 3 minutes window
            )

            if (recentDuplicate != null) {
                // If the follow-up SMS contains a reference ID that the first missed, enrich it
                if (recentDuplicate.referenceId == null && transaction.referenceId != null) {
                    val enriched = recentDuplicate.copy(
                        referenceId = transaction.referenceId,
                        accountDetails = transaction.accountDetails ?: recentDuplicate.accountDetails
                    )
                    dao.updateTransaction(enriched)
                }
                // Duplicate suppressed - prevents multiple entries
                return@launch
            }

            dao.insertTransaction(transaction)

            // Show real-time notification on Samsung device
            showNotification(context, transaction.type, transaction.amount, transaction.vendor)
        }
    }

    private fun showNotification(context: Context, type: TransactionType, amount: Double, vendor: String) {
        val channelId = "spend_tracker_channel"
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "Transaction Alerts",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Notifies when a bank SMS transaction is logged"
            }
            notificationManager.createNotificationChannel(channel)
        }

        val title = if (type == TransactionType.DEBIT) {
            "Debited: ₹${String.format("%.2f", amount)}"
        } else {
            "Credited: ₹${String.format("%.2f", amount)}"
        }

        val text = "Auto-recorded for $vendor into SpendTracker"

        val notification = NotificationCompat.Builder(context, channelId)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(text)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .build()

        notificationManager.notify((System.currentTimeMillis() % 10000).toInt(), notification)
    }
}
