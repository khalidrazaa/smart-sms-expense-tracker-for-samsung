package com.samsung.spendtracker.receiver

import com.samsung.spendtracker.data.PaymentMode
import com.samsung.spendtracker.data.TransactionEntity
import com.samsung.spendtracker.data.TransactionType
import java.util.regex.Pattern

data class SmsFilterConfig(
    val filterOtp: Boolean = true,
    val filterBillDues: Boolean = true,
    val filterPromos: Boolean = true,
    val filterBalanceInquiry: Boolean = true,
    val requireActionVerb: Boolean = true,
    val requireAccountAnchor: Boolean = false,
    val customExclusions: List<String> = emptyList()
)

data class SmsValidationResult(
    val isValid: Boolean,
    val reason: String,
    val entity: TransactionEntity? = null,
    val matchedVerb: String? = null,
    val detectedAmount: Double? = null,
    val detectedType: TransactionType? = null
)

object SmsParser {

    var activeConfig: SmsFilterConfig = SmsFilterConfig()

    // OTP and security code triggers
    private val OTP_PATTERNS = listOf(
        "otp", "one time password", "verification code", "secret code", "security code",
        "do not share", "never share", "valid for", "is your code"
    )

    // Unpaid bill / dues triggers (NOT spent yet)
    private val BILL_DUE_PATTERNS = listOf(
        "bill due", "bill of rs", "payment due", "due date", "pay before",
        "generated on", "minimum amount due", "total due", "bill generated",
        "to avoid late fee", "pay your bill", "recharge your"
    )

    // Promotional loan, credit card, or cashback offers
    private val PROMO_PATTERNS = listOf(
        "pre-approved", "avail loan", "get personal loan", "instant loan",
        "apply now", "click here", "congratulations", "win up to", "reward points",
        "claim your", "scratch card", "special offer", "discount of", "credited 50 points",
        "credit limit increased to"
    )

    // Debit action verbs
    private val DEBIT_KEYWORDS = listOf(
        "debited", "spent", "paid to", "paid at", "withdrawn", "transfer to", "transferred to",
        "vpa debited", "sent to", "purchased", "payment of", "purchase of"
    )

    // Credit action verbs
    private val CREDIT_KEYWORDS = listOf(
        "credited", "credited to", "deposited", "received from", "salary", "refund of",
        "cashback credited", "reversal of"
    )

    fun validateAndParse(
        smsBody: String,
        timestamp: Long = System.currentTimeMillis(),
        config: SmsFilterConfig = activeConfig
    ): SmsValidationResult {
        if (smsBody.isBlank() || smsBody.length < 12) {
            return SmsValidationResult(false, "Message too short to be a valid bank transaction.")
        }

        val lower = smsBody.lowercase()

        // 1. Anti-False-Positive Filter: OTP & Security Codes
        if (config.filterOtp) {
            val matchedOtp = OTP_PATTERNS.firstOrNull { lower.contains(it) }
            if (matchedOtp != null) {
                return SmsValidationResult(false, "Filtered out: Contains authentication/OTP keyword ('$matchedOtp').")
            }
        }

        // 2. Anti-False-Positive Filter: Bill Reminders / Unpaid Dues
        if (config.filterBillDues) {
            val matchedDue = BILL_DUE_PATTERNS.firstOrNull { lower.contains(it) }
            // Only reject if it does not explicitly say "paid" or "debited"
            val hasExplicitDebit = DEBIT_KEYWORDS.any { lower.contains(it) }
            if (matchedDue != null && !hasExplicitDebit) {
                return SmsValidationResult(false, "Filtered out: Bill payment reminder or due notice, not a confirmed expense.")
            }
        }

        // 3. Anti-False-Positive Filter: Promotional Offers & Loans
        if (config.filterPromos) {
            val matchedPromo = PROMO_PATTERNS.firstOrNull { lower.contains(it) }
            if (matchedPromo != null) {
                return SmsValidationResult(false, "Filtered out: Promotional loan/card advertisement ('$matchedPromo').")
            }
        }

        // 4. Custom user exclusions
        for (custom in config.customExclusions) {
            if (custom.isNotBlank() && lower.contains(custom.trim().lowercase())) {
                return SmsValidationResult(false, "Filtered out: Matched custom exclusion keyword ('$custom').")
            }
        }

        // 5. Amount Extraction
        val amount = extractAmount(smsBody)
        if (amount == null || amount <= 0.0) {
            return SmsValidationResult(false, "Filtered out: No valid currency amount detected.")
        }

        // 6. Action Verb Detection (Strict Bank Action)
        val hasDebit = DEBIT_KEYWORDS.any { lower.contains(it) }
        val hasCredit = CREDIT_KEYWORDS.any { lower.contains(it) }

        if (config.requireActionVerb && !hasDebit && !hasCredit) {
            // Standalone balance enquiry or random message with amount
            if (config.filterBalanceInquiry && (lower.contains("bal") || lower.contains("balance"))) {
                return SmsValidationResult(false, "Filtered out: Standalone balance inquiry alert with no transaction action.")
            }
            return SmsValidationResult(false, "Filtered out: No confirmed bank action verb (e.g. debited, paid, credited, spent).")
        }

        // 7. Account / UPI / Card Anchor requirement
        val account = extractAccount(smsBody)
        val referenceId = extractReference(smsBody)
        val hasBankName = containsBankIdentifier(smsBody)

        if (config.requireAccountAnchor && account == null && referenceId == null && !hasBankName) {
            return SmsValidationResult(false, "Filtered out: Missing bank account, card, or UPI reference anchor.")
        }

        // 8. Classify Type (Debit vs Credit)
        val type = if (hasCredit && !hasDebit) TransactionType.CREDIT else TransactionType.DEBIT
        val matchedVerb = if (type == TransactionType.CREDIT) {
            CREDIT_KEYWORDS.firstOrNull { lower.contains(it) } ?: "credited"
        } else {
            DEBIT_KEYWORDS.firstOrNull { lower.contains(it) } ?: "debited"
        }

        val vendor = extractVendor(smsBody, type)
        val category = categorize(vendor, smsBody, type)
        val action = if (type == TransactionType.DEBIT) "Paid to" else "Received from"
        val comment = "$action $vendor" + (if (referenceId != null) " (Ref: $referenceId)" else "")

        val entity = TransactionEntity(
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

        return SmsValidationResult(
            isValid = true,
            reason = "Valid ${type.name} transaction detected.",
            entity = entity,
            matchedVerb = matchedVerb,
            detectedAmount = amount,
            detectedType = type
        )
    }

    fun parse(smsBody: String, timestamp: Long = System.currentTimeMillis()): TransactionEntity? {
        val result = validateAndParse(smsBody, timestamp, activeConfig)
        return if (result.isValid) result.entity else null
    }

    private fun extractAmount(text: String): Double? {
        val patterns = listOf(
            // Rs. 450.00 or INR 450 or ₹450
            Pattern.compile("""(?:INR|Rs\.?|₹|\$|USD)\s*([\d,]+(?:\.\d{1,2})?)""", Pattern.CASE_INSENSITIVE),
            // debited by 450 or credited with 450
            Pattern.compile("""(?:debited|credited|spent|paid|withdrawn|refund of|received)\s*(?:by|for|of|with)?\s*(?:INR|Rs\.?|₹|\$)?\s*([\d,]+(?:\.\d{1,2})?)""", Pattern.CASE_INSENSITIVE),
            // 450.00 Rs or 450 INR
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

    private fun containsBankIdentifier(text: String): Boolean {
        val banks = listOf("HDFC", "SBI", "ICICI", "AXIS", "KOTAK", "PNB", "BOB", "CANARA", "UNION", "PAYTM", "GPAY", "PHONEPE", "CRED")
        val upper = text.uppercase()
        return banks.any { upper.contains(it) }
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
            val toPattern = Pattern.compile("""(?:paid to|transfer to|transferred to|sent to|to)\s+([A-Za-z0-9&'\.\- ]+?)(?:\s+(?:on|ref|upi|avl|bal|using|card|dated|\.|\,|$))""", Pattern.CASE_INSENSITIVE)
            val toMatcher = toPattern.matcher(clean)
            if (toMatcher.find()) {
                val candidate = toMatcher.group(1)?.trim()
                if (!candidate.isNullOrBlank() && candidate.length > 1) {
                    return candidate
                }
            }
        } else {
            val fromPattern = Pattern.compile("""(?:received from|deposited by|from|by)\s+([A-Za-z0-9&'\.\- ]+?)(?:\s+(?:on|ref|upi|avl|bal|using|card|dated|\.|\,|$))""", Pattern.CASE_INSENSITIVE)
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

        val bankPattern = Pattern.compile("""\b(HDFC|SBI|ICICI|AXIS|KOTAK|PNB|CHASE|CITI|AMEX)\b""", Pattern.CASE_INSENSITIVE)
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

    private fun categorize(vendor: String, smsBody: String, type: TransactionType): String {
        val lower = ("$vendor $smsBody").lowercase()
        return when {
            type == TransactionType.CREDIT && (lower.contains("salary") || lower.contains("payroll") || lower.contains("stipend")) -> "Salary & Income"
            listOf("swiggy", "zomato", "mcdonald", "starbucks", "domino", "pizza", "kfc", "burger", "cafe", "restaurant", "food", "dining", "eatery", "bakery", "tea", "coffee").any { lower.contains(it) } -> "Food & Dining"
            listOf("supermarket", "grocery", "groceries", "mart", "dmart", "bigbasket", "blinkit", "zepto", "instamart", "kirana", "provisions", "vegetables", "fruits", "milk").any { lower.contains(it) } -> "Groceries"
            listOf("amazon", "flipkart", "myntra", "ajio", "meesho", "nykaa", "zara", "h&m", "retail", "clothing", "shopping", "store").any { lower.contains(it) } -> "Shopping"
            listOf("uber", "ola", "rapido", "metro", "fuel", "petrol", "diesel", "shell", "hpcl", "iocl", "bpcl", "toll", "fastag", "parking").any { lower.contains(it) } -> "Transport"
            listOf("bescom", "electricity", "water", "gas", "bill", "recharge", "airtel", "jio", "vi", "wifi", "broadband", "dth").any { lower.contains(it) } -> "Bills & Utilities"
            listOf("netflix", "spotify", "hotstar", "prime video", "cinema", "movie", "pvr", "inox", "bookmyshow").any { lower.contains(it) } -> "Entertainment"
            listOf("pharmacy", "apollo", "medplus", "1mg", "pharmeasy", "hospital", "clinic", "doctor", "lab").any { lower.contains(it) } -> "Health & Medical"
            listOf("atm", "cash wdl", "cash withdrawal").any { lower.contains(it) } -> "Cash & ATM"
            type == TransactionType.CREDIT -> "Salary & Income"
            else -> "Other"
        }
    }
}

