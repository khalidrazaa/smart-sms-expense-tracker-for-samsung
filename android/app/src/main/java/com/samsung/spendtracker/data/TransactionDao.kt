package com.samsung.spendtracker.data

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Dao
interface TransactionDao {
    @Query("SELECT * FROM transactions ORDER BY timestamp DESC")
    fun getAllTransactions(): Flow<List<TransactionEntity>>

    @Query("SELECT * FROM transactions WHERE type = :type ORDER BY timestamp DESC")
    fun getTransactionsByType(type: TransactionType): Flow<List<TransactionEntity>>

    @Query("SELECT * FROM transactions WHERE paymentMode = :mode ORDER BY timestamp DESC")
    fun getTransactionsByMode(mode: PaymentMode): Flow<List<TransactionEntity>>

    @Query("SELECT SUM(amount) FROM transactions WHERE type = 'DEBIT'")
    fun getTotalDebits(): Flow<Double?>

    @Query("SELECT SUM(amount) FROM transactions WHERE type = 'CREDIT'")
    fun getTotalCredits(): Flow<Double?>

    @Query("SELECT SUM(amount) FROM transactions WHERE type = 'DEBIT' AND paymentMode = 'CASH'")
    fun getTotalCashSpent(): Flow<Double?>

    @Query("SELECT COUNT(*) FROM transactions WHERE referenceId = :refId AND referenceId IS NOT NULL")
    suspend fun countByReferenceId(refId: String): Int

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTransaction(transaction: TransactionEntity): Long

    @Update
    suspend fun updateTransaction(transaction: TransactionEntity)

    @Delete
    suspend fun deleteTransaction(transaction: TransactionEntity)

    @Query("DELETE FROM transactions")
    suspend fun clearAll()
}
