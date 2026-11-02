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

    fun deleteTransaction(transaction: TransactionEntity) {
        viewModelScope.launch {
            dao.deleteTransaction(transaction)
        }
    }

    fun clearAll() {
        viewModelScope.launch {
            dao.clearAll()
        }
    }
}
