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

    @Query("SELECT COUNT(*) FROM transactions WHERE rawSms = :rawSms")
    suspend fun countByRawSms(rawSms: String): Int

    @Query("""
        SELECT COUNT(*) FROM transactions 
        WHERE type = :type 
          AND ABS(amount - :amount) < 0.01 
          AND ABS(timestamp - :timestamp) < :windowMs
    """)
    suspend fun countRecentDuplicates(
        type: TransactionType,
        amount: Double,
        timestamp: Long,
        windowMs: Long = 180_000L
    ): Int

    @Query("""
        SELECT * FROM transactions 
        WHERE type = :type 
          AND ABS(amount - :amount) < 0.01 
          AND ABS(timestamp - :timestamp) < :windowMs
        ORDER BY timestamp DESC LIMIT 1
    """)
    suspend fun findRecentDuplicate(
        type: TransactionType,
        amount: Double,
        timestamp: Long,
        windowMs: Long = 180_000L
    ): TransactionEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTransaction(transaction: TransactionEntity): Long

    @Update
    suspend fun updateTransaction(transaction: TransactionEntity)

    @Delete
    suspend fun deleteTransaction(transaction: TransactionEntity)

    @Query("DELETE FROM transactions")
    suspend fun clearAll()
}
