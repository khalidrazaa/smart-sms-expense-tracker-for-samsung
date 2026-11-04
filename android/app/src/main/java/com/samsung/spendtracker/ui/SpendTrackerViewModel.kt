package com.samsung.spendtracker.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.samsung.spendtracker.data.*
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

data class FinancialUiState(
    val transactions: List<TransactionEntity> = emptyList(),
    val totalDebits: Double = 0.0,
    val totalCredits: Double = 0.0,
    val netBalance: Double = 0.0,
    val totalCashSpent: Double = 0.0
)

class SpendTrackerViewModel(
    private val dao: TransactionDao
) : ViewModel() {

    val uiState: StateFlow<FinancialUiState> = combine(
        dao.getAllTransactions(),
        dao.getTotalDebits(),
        dao.getTotalCredits(),
        dao.getTotalCashSpent()
    ) { transactions, debits, credits, cashSpent ->
        val deb = debits ?: 0.0
        val cred = credits ?: 0.0
        FinancialUiState(
            transactions = transactions,
            totalDebits = deb,
            totalCredits = cred,
            netBalance = cred - deb,
            totalCashSpent = cashSpent ?: 0.0
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = FinancialUiState()
    )

    fun addManualTransaction(
        amount: Double,
        type: TransactionType,
        vendor: String,
        category: String,
        comment: String?,
        paymentMode: PaymentMode = PaymentMode.CASH
    ) {
        viewModelScope.launch {
            val entity = TransactionEntity(
                amount = amount,
                type = type,
                vendor = vendor.ifBlank { if (type == TransactionType.DEBIT) "Cash Expense" else "Cash Income" },
                category = category,
                comment = comment,
                paymentMode = paymentMode,
                accountDetails = if (paymentMode == PaymentMode.CASH) "Cash in Hand" else "Bank"
            )
            dao.insertTransaction(entity)
        }
    }

    fun parseAndAddSms(smsText: String, onResult: (Boolean) -> Unit) {
        viewModelScope.launch {
            val parsed = com.samsung.spendtracker.receiver.SmsParser.parse(smsText)
            if (parsed != null) {
                dao.insertTransaction(parsed)
                onResult(true)
            } else {
                onResult(false)
            }
        }
    }

    fun scanInbox(context: android.content.Context, onComplete: (Int) -> Unit) {
        viewModelScope.launch(kotlinx.coroutines.Dispatchers.IO) {
            var addedCount = 0
            val uri = android.provider.Telephony.Sms.Inbox.CONTENT_URI
            val colBody = "body"
            val colDate = "date"
            val projection = arrayOf(colBody, colDate)

            try {
                val cursor = context.contentResolver.query(
                    uri,
                    projection,
                    null,
                    null,
                    "$colDate DESC LIMIT 300"
                )

                cursor?.use { c ->
                    val bodyIndex = c.getColumnIndex(colBody)
                    val dateIndex = c.getColumnIndex(colDate)

                    while (c.moveToNext()) {
                        val body = if (bodyIndex >= 0) c.getString(bodyIndex) else null
                        val date = if (dateIndex >= 0) c.getLong(dateIndex) else System.currentTimeMillis()

                        if (!body.isNullOrBlank()) {
                            val parsed = com.samsung.spendtracker.receiver.SmsParser.parse(body, date)
                            if (parsed != null) {
                                // Check if already inserted
                                val refExists = parsed.referenceId?.let { dao.countByReferenceId(it) > 0 } ?: false
                                val smsExists = dao.countByRawSms(body) > 0

                                if (!refExists && !smsExists) {
                                    dao.insertTransaction(parsed)
                                    addedCount++
                                }
                            }
                        }
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }

            kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.Main) {
                onComplete(addedCount)
            }
        }
    }

    fun deleteTransaction(transaction: TransactionEntity) {
        viewModelScope.launch {
            dao.deleteTransaction(transaction)
        }
    }

    fun clearAllTransactions() {
        viewModelScope.launch {
            dao.clearAll()
        }
    }

    fun resetToSampleData() {
        viewModelScope.launch {
            dao.clearAll()
            val now = System.currentTimeMillis()
            val dayMs = 86_400_000L
            val samples = listOf(
                TransactionEntity(
                    amount = 54000.0,
                    type = TransactionType.CREDIT,
                    vendor = "TechCorp Solutions (Salary)",
                    comment = "Monthly Salary Deposit Nov 2024",
                    category = "Salary",
                    paymentMode = PaymentMode.SMS,
                    accountDetails = "HDFC Bank XX4012",
                    timestamp = now - (dayMs * 2)
                ),
                TransactionEntity(
                    amount = 450.0,
                    type = TransactionType.DEBIT,
                    vendor = "Swiggy Online Food",
                    comment = "Dinner delivery",
                    category = "Food & Dining",
                    paymentMode = PaymentMode.UPI,
                    accountDetails = "HDFC Bank XX4012",
                    timestamp = now - (dayMs * 3)
                ),
                TransactionEntity(
                    amount = 1200.0,
                    type = TransactionType.DEBIT,
                    vendor = "Local Grocery Store",
                    comment = "Weekly vegetables & fruits",
                    category = "Groceries",
                    paymentMode = PaymentMode.CASH,
                    accountDetails = "Cash in Hand",
                    timestamp = now - (dayMs * 4)
                ),
                TransactionEntity(
                    amount = 2499.0,
                    type = TransactionType.DEBIT,
                    vendor = "Amazon India",
                    comment = "Wireless earphones",
                    category = "Shopping",
                    paymentMode = PaymentMode.SMS,
                    accountDetails = "ICICI Bank XX8901",
                    timestamp = now - (dayMs * 8)
                ),
                TransactionEntity(
                    amount = 54000.0,
                    type = TransactionType.CREDIT,
                    vendor = "TechCorp Solutions (Salary)",
                    comment = "Monthly Salary Deposit Oct 2024",
                    category = "Salary",
                    paymentMode = PaymentMode.SMS,
                    accountDetails = "HDFC Bank XX4012",
                    timestamp = now - (dayMs * 35)
                ),
                TransactionEntity(
                    amount = 3100.0,
                    type = TransactionType.DEBIT,
                    vendor = "Electricity & Water Board",
                    comment = "Monthly utility bill payment",
                    category = "Bills & Utilities",
                    paymentMode = PaymentMode.SMS,
                    accountDetails = "HDFC Bank XX4012",
                    timestamp = now - (dayMs * 38)
                ),
                TransactionEntity(
                    amount = 850.0,
                    type = TransactionType.DEBIT,
                    vendor = "Cafe Coffee Day",
                    comment = "Coffee with friends",
                    category = "Food & Dining",
                    paymentMode = PaymentMode.CASH,
                    accountDetails = "Cash in Hand",
                    timestamp = now - (dayMs * 42)
                )
            )
            for (txn in samples) {
                dao.insertTransaction(txn)
            }
        }
    }
}
