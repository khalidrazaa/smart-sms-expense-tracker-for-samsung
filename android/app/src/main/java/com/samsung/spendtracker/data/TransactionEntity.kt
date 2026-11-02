package com.samsung.spendtracker.data

import androidx.room.Entity
import androidx.room.PrimaryKey

enum class TransactionType {
    DEBIT,  // Spendings (-)
    CREDIT  // Earnings (+)
}

enum class PaymentMode {
    SMS,
    CASH,
    CARD,
    UPI
}

@Entity(tableName = "transactions")
data class TransactionEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val amount: Double,
    val type: TransactionType,
    val vendor: String,
    val comment: String?,
    val category: String,
    val paymentMode: PaymentMode,
    val accountDetails: String? = null,
    val referenceId: String? = null,
    val rawSms: String? = null,
    val timestamp: Long = System.currentTimeMillis()
)
