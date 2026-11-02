package com.samsung.spendtracker.receiver

import com.samsung.spendtracker.data.PaymentMode
import com.samsung.spendtracker.data.TransactionEntity
import com.samsung.spendtracker.data.TransactionType
import java.util.regex.Pattern

object SmsParser {

    data class ParsedResult(
        val amount: Double,
        val type: TransactionType,
        val vendor: String,
        val category: String,
        val accountDetails: String?,
        val referenceId: String?,
        val comment: String
    )

    fun parse(smsBody: String, timestamp: Long = System.currentTimeMillis()): TransactionEntity? {
        if (smsBody.length < 15) return null

        val amount = extractAmount(smsBody) ?: return null
        val type = detectType(smsBody)
        val vendor = extractVendor(smsBody, type)
        val category = categorize(vendor, type)
        val account = extractAccount(smsBody)
        val referenceId = extractReference(smsBody)

        val action = if (type == TransactionType.DEBIT) "Paid to" else "Received from"
        val comment = "$action $vendor" + (if (referenceId != null) " (Ref: $referenceId)" else "")

        return TransactionEntity(
            amount = amount,
            type = type,
            vendor = vendor,
            comment = comment,
            category = category,
            paymentMode = PaymentMode.SMS,
            accountDetails = account,
            referenceId = referenceId,
            rawSms = smsBody,
            timestamp = timestamp
        )
    }

    private fun extractAmount(text: String): Double? {
        val patterns = listOf(
            Pattern.compile("""(?:INR|Rs\.?|₹|\$|USD)\s*([\d,]+(?:\.\d{1,2})?)""", Pattern.CASE_INSENSITIVE),
            Pattern.compile("""(?:debited|credited|spent|paid|withdrawn|refund of|received)\s*(?:by|for|of)?\s*(?:INR|Rs\.?|₹|\$)?\s*([\d,]+(?:\.\d{1,2})?)""", Pattern.CASE_INSENSITIVE),
            Pattern.compile("""([\d,]+(?:\.\d{1,2})?)\s*(?:INR|Rs\.?|₹)""", Pattern.CASE_INSENSITIVE)
        )

        for (p in patterns) {
            val matcher = p.matcher(text)
            if (matcher.find()) {
                val numStr = matcher.group(1)?.replace(",", "")
                val amt = numStr?.toDoubleOrNull()
                if (amt != null && amt > 0.0) return amt
            }
        }
        return null
    }

    private fun detectType(text: String): TransactionType {
        val lower = text.lowercase()
        val creditKeywords = listOf("credited", "received", "deposited", "salary", "refund", "cashback")
        val debitKeywords = listOf("debited", "spent", "paid", "withdrawn", "sent", "purchased")

        val isCredit = creditKeywords.any { lower.contains(it) }
        val isDebit = debitKeywords.any { lower.contains(it) }

        return if (isCredit && !isDebit) TransactionType.CREDIT else TransactionType.DEBIT
    }

    private fun extractVendor(text: String, type: TransactionType): String {
        val clean = text.replace("\n", " ")

        val atPattern = Pattern.compile("""(?:at|vdr|info|towards|for)\s+([A-Za-z0-9&'\.\- ]+?)(?:\s+(?:on|ref|upi|avl|bal|using|card|dated|\.|\,|$))""", Pattern.CASE_INSENSITIVE)
        val atMatcher = atPattern.matcher(clean)
        if (atMatcher.find()) {
            val candidate = atMatcher.group(1)?.trim()
            if (!candidate.isNullOrBlank() && candidate.length > 1) {
                return candidate
            }
        }

        if (type == TransactionType.DEBIT) {
            val toPattern = Pattern.compile("""(?:paid to|transfer to|sent to|to)\s+([A-Za-z0-9&'\.\- ]+?)(?:\s+(?:on|ref|upi|avl|bal|using|card|dated|\.|\,|$))""", Pattern.CASE_INSENSITIVE)
            val toMatcher = toPattern.matcher(clean)
            if (toMatcher.find()) {
                val candidate = toMatcher.group(1)?.trim()
                if (!candidate.isNullOrBlank() && candidate.length > 1) {
                    return candidate
                }
            }
        } else {
            val fromPattern = Pattern.compile("""(?:received from|from|by)\s+([A-Za-z0-9&'\.\- ]+?)(?:\s+(?:on|ref|upi|avl|bal|using|card|dated|\.|\,|$))""", Pattern.CASE_INSENSITIVE)
            val fromMatcher = fromPattern.matcher(clean)
            if (fromMatcher.find()) {
                val candidate = fromMatcher.group(1)?.trim()
                if (!candidate.isNullOrBlank() && candidate.length > 1) {
                    return candidate
                }
            }
        }

        if (clean.contains("ATM", ignoreCase = true)) {
            return "ATM Cash Withdrawal"
        }

        val bankPattern = Pattern.compile("""^(HDFC|SBI|ICICI|AXIS|KOTAK|PNB|CHASE|CITI|AMEX)""", Pattern.CASE_INSENSITIVE)
        val bankMatcher = bankPattern.matcher(clean)
        if (bankMatcher.find()) {
            return "${bankMatcher.group(1)?.uppercase()} Transaction"
        }

        return if (type == TransactionType.CREDIT) "Account Credit" else "Bank Merchant"
    }

    private fun extractAccount(text: String): String? {
        val pattern = Pattern.compile("""(?:A\/c|Acct|Account|Card)\s*(?:no\.?)?\s*([xX*]*\d{3,4})""", Pattern.CASE_INSENSITIVE)
        val matcher = pattern.matcher(text)
        if (matcher.find()) {
            val num = matcher.group(1)?.replace(Regex("^[xX*]+"), "")
            return "A/c XX$num"
        }
        return null
    }

    private fun extractReference(text: String): String? {
        val pattern = Pattern.compile("""(?:UPI\s*Ref|Ref|Txn\s*Id)(?:\s*no\.?)?\s*:?\s*([A-Za-z0-9]{6,16})""", Pattern.CASE_INSENSITIVE)
        val matcher = pattern.matcher(text)
        if (matcher.find()) {
            return matcher.group(1)
        }
        return null
    }

    private fun categorize(vendor: String, type: TransactionType): String {
        val lower = vendor.lowercase()
        return when {
            type == TransactionType.CREDIT && (lower.contains("salary") || lower.contains("payroll")) -> "Salary & Income"
            listOf("swiggy", "zomato", "mcdonalds", "starbucks", "dominos", "pizza", "kfc", "cafe", "restaurant", "food", "dining").any { lower.contains(it) } -> "Food & Dining"
            listOf("supermarket", "grocery", "mart", "dmart", "bigbasket", "kirana", "provisions").any { lower.contains(it) } -> "Groceries"
            listOf("amazon", "flipkart", "myntra", "ajio", "meesho", "zara", "retail", "store").any { lower.contains(it) } -> "Shopping"
            listOf("uber", "ola", "rapido", "metro", "fuel", "petrol", "diesel", "shell", "toll", "fastag").any { lower.contains(it) } -> "Transport"
            listOf("bill", "recharge", "airtel", "jio", "vi", "wifi", "broadband", "electricity").any { lower.contains(it) } -> "Bills & Utilities"
            listOf("netflix", "spotify", "hotstar", "cinema", "movie", "pvr").any { lower.contains(it) } -> "Entertainment"
            listOf("pharmacy", "apollo", "hospital", "clinic", "doctor").any { lower.contains(it) } -> "Health & Medical"
            listOf("atm", "cash wdl", "cash withdrawal").any { lower.contains(it) } -> "Cash & ATM"
            type == TransactionType.CREDIT -> "Salary & Income"
            else -> "Other"
        }
    }
}
