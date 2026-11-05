package com.samsung.spendtracker

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import com.samsung.spendtracker.data.*
import com.samsung.spendtracker.ui.FinancialUiState
import com.samsung.spendtracker.ui.SpendTrackerViewModel
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

class MainActivity : ComponentActivity() {

    private lateinit var viewModel: SpendTrackerViewModel

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val db = (application as SpendTrackerApp).database
        viewModel = SpendTrackerViewModel(db.transactionDao())

        setContent {
            MaterialTheme(
                colorScheme = darkColorScheme(
                    background = Color(0xFF090D16),
                    surface = Color(0xFF111827),
                    primary = Color(0xFF0284C7),
                    onPrimary = Color.White
                )
            ) {
                MainScreen(viewModel)
            }
        }
    }
}

enum class AppTab { LEDGER, ANALYTICS, SMS_SYNC, SETTINGS }

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainScreen(viewModel: SpendTrackerViewModel) {
    val context = LocalContext.current
    val uiState by viewModel.uiState.collectAsState()
    var currentTab by remember { mutableStateOf(AppTab.LEDGER) }

    var hasSmsPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.RECEIVE_SMS) == PackageManager.PERMISSION_GRANTED
        )
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        hasSmsPermission = permissions[Manifest.permission.RECEIVE_SMS] == true
    }

    LaunchedEffect(Unit) {
        val permissionsToRequest = mutableListOf(
            Manifest.permission.RECEIVE_SMS,
            Manifest.permission.READ_SMS
        )
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissionsToRequest.add(Manifest.permission.POST_NOTIFICATIONS)
        }
        permissionLauncher.launch(permissionsToRequest.toTypedArray())
    }

    var showAddDialog by remember { mutableStateOf(false) }
    var showPasteSmsDialog by remember { mutableStateOf(false) }
    var isScanning by remember { mutableStateOf(false) }
    val snackbarHostState = remember { SnackbarHostState() }
    val coroutineScope = rememberCoroutineScope()

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = {
                    val deviceModel = remember {
                        val manufacturer = Build.MANUFACTURER.replaceFirstChar {
                            if (it.isLowerCase()) it.titlecase(Locale.getDefault()) else it.toString()
                        }
                        val model = Build.MODEL
                        if (model.startsWith(manufacturer, ignoreCase = true)) model else "$manufacturer $model"
                    }
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = "SpendTracker",
                                fontWeight = FontWeight.Bold,
                                fontSize = 18.sp
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Surface(
                                color = Color(0xFF0C4A6E),
                                shape = RoundedCornerShape(4.dp)
                            ) {
                                Text(
                                    text = deviceModel.ifBlank { "Samsung A57" },
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = Color(0xFF38BDF8),
                                    modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)
                                )
                            }
                        }
                        Text(
                            text = if (hasSmsPermission) "Auto SMS Reader Active" else "SMS Permission Needed",
                            fontSize = 11.sp,
                            color = if (hasSmsPermission) Color(0xFF10B981) else Color(0xFFF43F5E)
                        )
                    }
                },
                actions = {
                    // Paste SMS Button
                    IconButton(onClick = { showPasteSmsDialog = true }) {
                        Icon(
                            imageVector = Icons.Default.Email,
                            contentDescription = "Paste SMS",
                            tint = Color(0xFF38BDF8)
                        )
                    }

                    // Scan Inbox Button
                    IconButton(
                        onClick = {
                            if (!hasSmsPermission) {
                                permissionLauncher.launch(arrayOf(Manifest.permission.RECEIVE_SMS, Manifest.permission.READ_SMS))
                            } else {
                                isScanning = true
                                viewModel.scanInbox(context) { added, dups ->
                                    isScanning = false
                                    coroutineScope.launch {
                                        if (added > 0) {
                                            val dupInfo = if (dups > 0) " ($dups duplicate alert(s) filtered)" else ""
                                            snackbarHostState.showSnackbar("Found and imported $added bank transaction(s)$dupInfo!")
                                        } else {
                                            val dupInfo = if (dups > 0) " ($dups duplicate alert(s) suppressed)" else ""
                                            snackbarHostState.showSnackbar("Scan complete. No new bank SMS found$dupInfo.")
                                        }
                                    }
                                }
                            }
                        },
                        enabled = !isScanning
                    ) {
                        if (isScanning) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(20.dp),
                                color = Color(0xFF38BDF8),
                                strokeWidth = 2.dp
                            )
                        } else {
                            Icon(
                                imageVector = Icons.Default.Refresh,
                                contentDescription = "Scan SMS Inbox",
                                tint = Color.White
                            )
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color(0xFF090D16),
                    titleContentColor = Color.White
                )
            )
        },
        bottomBar = {
            NavigationBar(
                containerColor = Color(0xFF0F172A),
                contentColor = Color.White
            ) {
                NavigationBarItem(
                    icon = { Icon(Icons.Default.ReceiptLong, contentDescription = "Ledger") },
                    label = { Text("Ledger", fontSize = 10.sp, fontWeight = FontWeight.Bold) },
                    selected = currentTab == AppTab.LEDGER,
                    onClick = { currentTab = AppTab.LEDGER },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = Color(0xFF38BDF8),
                        selectedTextColor = Color(0xFF38BDF8),
                        indicatorColor = Color(0xFF0C4A6E),
                        unselectedIconColor = Color(0xFF94A3B8),
                        unselectedTextColor = Color(0xFF94A3B8)
                    )
                )
                NavigationBarItem(
                    icon = { Icon(Icons.Default.PieChart, contentDescription = "Analytics") },
                    label = { Text("Analytics", fontSize = 10.sp, fontWeight = FontWeight.Bold) },
                    selected = currentTab == AppTab.ANALYTICS,
                    onClick = { currentTab = AppTab.ANALYTICS },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = Color(0xFF38BDF8),
                        selectedTextColor = Color(0xFF38BDF8),
                        indicatorColor = Color(0xFF0C4A6E),
                        unselectedIconColor = Color(0xFF94A3B8),
                        unselectedTextColor = Color(0xFF94A3B8)
                    )
                )
                NavigationBarItem(
                    icon = { Icon(Icons.Default.Sms, contentDescription = "SMS Sync") },
                    label = { Text("SMS Sync", fontSize = 10.sp, fontWeight = FontWeight.Bold) },
                    selected = currentTab == AppTab.SMS_SYNC,
                    onClick = { currentTab = AppTab.SMS_SYNC },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = Color(0xFF38BDF8),
                        selectedTextColor = Color(0xFF38BDF8),
                        indicatorColor = Color(0xFF0C4A6E),
                        unselectedIconColor = Color(0xFF94A3B8),
                        unselectedTextColor = Color(0xFF94A3B8)
                    )
                )
                NavigationBarItem(
                    icon = { Icon(Icons.Default.Settings, contentDescription = "Settings") },
                    label = { Text("Settings", fontSize = 10.sp, fontWeight = FontWeight.Bold) },
                    selected = currentTab == AppTab.SETTINGS,
                    onClick = { currentTab = AppTab.SETTINGS },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = Color(0xFF38BDF8),
                        selectedTextColor = Color(0xFF38BDF8),
                        indicatorColor = Color(0xFF0C4A6E),
                        unselectedIconColor = Color(0xFF94A3B8),
                        unselectedTextColor = Color(0xFF94A3B8)
                    )
                )
            }
        },
        floatingActionButton = {
            if (currentTab == AppTab.LEDGER) {
                FloatingActionButton(
                    onClick = { showAddDialog = true },
                    containerColor = Color(0xFF0284C7),
                    contentColor = Color.White,
                    shape = CircleShape
                ) {
                    Icon(Icons.Default.Add, contentDescription = "Add Cash Spend")
                }
            }
        },
        containerColor = Color(0xFF090D16)
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(horizontal = 16.dp)
        ) {
            when (currentTab) {
                AppTab.LEDGER -> {
                    LedgerView(
                        transactions = uiState.transactions,
                        hasSmsPermission = hasSmsPermission,
                        onGrantPermission = {
                            permissionLauncher.launch(arrayOf(Manifest.permission.RECEIVE_SMS, Manifest.permission.READ_SMS))
                        },
                        onDeleteTransaction = { viewModel.deleteTransaction(it) }
                    )
                }
                AppTab.ANALYTICS -> {
                    AnalyticsScreen(transactions = uiState.transactions)
                }
                AppTab.SMS_SYNC -> {
                    SmsSyncScreen(
                        hasPermission = hasSmsPermission,
                        isScanning = isScanning,
                        onGrantPermission = {
                            permissionLauncher.launch(arrayOf(Manifest.permission.RECEIVE_SMS, Manifest.permission.READ_SMS))
                        },
                        onScanInbox = {
                            isScanning = true
                            viewModel.scanInbox(context) { added, dups ->
                                isScanning = false
                                coroutineScope.launch {
                                    if (added > 0) {
                                        val dupInfo = if (dups > 0) " ($dups duplicate alert(s) filtered)" else ""
                                        snackbarHostState.showSnackbar("Found and imported $added bank transaction(s)$dupInfo!")
                                    } else {
                                        val dupInfo = if (dups > 0) " ($dups duplicate alert(s) suppressed)" else ""
                                        snackbarHostState.showSnackbar("Scan complete. No new bank SMS found$dupInfo.")
                                    }
                                }
                            }
                        },
                        onPasteSms = { showPasteSmsDialog = true }
                    )
                }
                AppTab.SETTINGS -> {
                    SettingsScreen(
                        onResetSampleData = {
                            viewModel.resetToSampleData()
                            coroutineScope.launch {
                                snackbarHostState.showSnackbar("Database reset to sample transactions.")
                            }
                        },
                        onClearAll = {
                            viewModel.clearAllTransactions()
                            coroutineScope.launch {
                                snackbarHostState.showSnackbar("All transactions cleared from database.")
                            }
                        }
                    )
                }
            }
        }
    }

    if (showAddDialog) {
        AddCashDialog(
            onDismiss = { showAddDialog = false },
            onAdd = { amount, type, vendor, category, comment ->
                viewModel.addManualTransaction(amount, type, vendor, category, comment)
                showAddDialog = false
            }
        )
    }

    if (showPasteSmsDialog) {
        PasteSmsDialog(
            onDismiss = { showPasteSmsDialog = false },
            onParse = { text ->
                viewModel.parseAndAddSms(text) { success, msg ->
                    coroutineScope.launch {
                        if (success) {
                            snackbarHostState.showSnackbar(msg ?: "SMS parsed and transaction added successfully!")
                        } else {
                            snackbarHostState.showSnackbar(msg ?: "Could not detect bank transaction. Try manual entry.")
                        }
                    }
                }
                showPasteSmsDialog = false
            }
        )
    }
}

@Composable
fun BalanceSummaryCard(
    netBalance: Double,
    totalDebits: Double,
    totalCredits: Double,
    totalCashSpent: Double,
    selectedYear: String,
    onYearSelected: (String) -> Unit,
    availableYears: List<String>,
    selectedMonths: Set<Int>,
    onToggleMonth: (Int) -> Unit,
    onSelectAllMonths: () -> Unit
) {
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF111827)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            // ROW 1: TOTAL NET BALANCE (LEFT) | SELECTABLE DROP DOWN MENU FOR YEAR (RIGHT)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "TOTAL NET BALANCE",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Color(0xFF94A3B8)
                )

                // Year Dropdown Menu (Right-Aligned)
                Box {
                    var yearMenuExpanded by remember { mutableStateOf(false) }
                    Surface(
                        color = Color(0xFF1E293B),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.clickable { yearMenuExpanded = true }
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                        ) {
                            Text(
                                text = if (selectedYear == "all") "All Years" else selectedYear,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                            Icon(
                                imageVector = Icons.Default.ArrowDropDown,
                                contentDescription = null,
                                tint = Color(0xFF94A3B8),
                                modifier = Modifier.size(16.dp)
                            )
                        }
                    }
                    DropdownMenu(
                        expanded = yearMenuExpanded,
                        onDismissRequest = { yearMenuExpanded = false }
                    ) {
                        DropdownMenuItem(
                            text = { Text("All Years") },
                            onClick = {
                                onYearSelected("all")
                                yearMenuExpanded = false
                            }
                        )
                        availableYears.forEach { yr ->
                            DropdownMenuItem(
                                text = { Text(yr) },
                                onClick = {
                                    onYearSelected(yr)
                                    yearMenuExpanded = false
                                }
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(4.dp))

            // ROW 2: AMOUNT (LEFT) | SELECTABLE MULTISELECT MENU FOR MONTHS (RIGHT)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "${if (netBalance >= 0) "" else "-"}₹${String.format("%,.2f", Math.abs(netBalance))}",
                    fontSize = 24.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = if (netBalance >= 0) Color.White else Color(0xFFFB7185)
                )

                // Month Multiselect Menu (Right-Aligned)
                Box {
                    var monthMenuExpanded by remember { mutableStateOf(false) }
                    val monthNames = listOf("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")
                    val monthButtonLabel = when {
                        selectedMonths.isEmpty() -> "All Months"
                        selectedMonths.size == 1 -> monthNames.getOrElse(selectedMonths.first() - 1) { "1 Month" }
                        selectedMonths.size <= 2 -> selectedMonths.sorted().map { monthNames.getOrElse(it - 1) { "" } }.joinToString(", ")
                        else -> "${selectedMonths.size} Months"
                    }

                    Surface(
                        color = if (selectedMonths.isNotEmpty()) Color(0xFF0C4A6E) else Color(0xFF1E293B),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.clickable { monthMenuExpanded = true }
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.DateRange,
                                contentDescription = null,
                                tint = Color(0xFF38BDF8),
                                modifier = Modifier.size(13.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = monthButtonLabel,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (selectedMonths.isNotEmpty()) Color(0xFF38BDF8) else Color.White
                            )
                            Icon(
                                imageVector = Icons.Default.ArrowDropDown,
                                contentDescription = null,
                                tint = Color(0xFF94A3B8),
                                modifier = Modifier.size(16.dp)
                            )
                        }
                    }

                    DropdownMenu(
                        expanded = monthMenuExpanded,
                        onDismissRequest = { monthMenuExpanded = false }
                    ) {
                        DropdownMenuItem(
                            text = { Text("All Months (Select All)") },
                            onClick = { onSelectAllMonths() }
                        )
                        HorizontalDivider()
                        monthNames.forEachIndexed { index, name ->
                            val monthIndex = index + 1
                            val isSelected = selectedMonths.contains(monthIndex)
                            DropdownMenuItem(
                                text = {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(name)
                                        if (isSelected) {
                                            Icon(
                                                imageVector = Icons.Default.Check,
                                                contentDescription = null,
                                                tint = Color(0xFF38BDF8),
                                                modifier = Modifier.size(16.dp)
                                            )
                                        }
                                    }
                                },
                                onClick = { onToggleMonth(monthIndex) }
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))
            HorizontalDivider(color = Color(0xFF1E293B))
            Spacer(modifier = Modifier.height(12.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column {
                    Text(text = "Total Debited (-)", fontSize = 11.sp, color = Color(0xFF94A3B8))
                    Text(
                        text = "-₹${String.format("%,.2f", totalDebits)}",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFFFB7185)
                    )
                }
                Column {
                    Text(text = "Total Credited (+)", fontSize = 11.sp, color = Color(0xFF94A3B8))
                    Text(
                        text = "+₹${String.format("%,.2f", totalCredits)}",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF34D399)
                    )
                }
                Column {
                    Text(text = "Cash Spent", fontSize = 11.sp, color = Color(0xFF94A3B8))
                    Text(
                        text = "₹${String.format("%,.2f", totalCashSpent)}",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFFFBBF24)
                    )
                }
            }
        }
    }
}

@Composable
fun MonthHeaderRow(
    monthLabel: String,
    totalDebits: Double,
    totalCredits: Double,
    count: Int
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 4.dp, vertical = 6.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(
                imageVector = Icons.Default.DateRange,
                contentDescription = null,
                tint = Color(0xFF38BDF8),
                modifier = Modifier.size(15.dp)
            )
            Spacer(modifier = Modifier.width(6.dp))
            Text(
                text = monthLabel,
                fontWeight = FontWeight.Bold,
                fontSize = 13.sp,
                color = Color.White
            )
            Spacer(modifier = Modifier.width(6.dp))
            Text(
                text = "($count)",
                fontSize = 11.sp,
                color = Color(0xFF94A3B8)
            )
        }

        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text(
                text = "-₹${String.format("%,.2f", totalDebits)}",
                fontSize = 11.sp,
                fontWeight = FontWeight.SemiBold,
                color = Color(0xFFFB7185)
            )
            Text(
                text = "+₹${String.format("%,.2f", totalCredits)}",
                fontSize = 11.sp,
                fontWeight = FontWeight.SemiBold,
                color = Color(0xFF34D399)
            )
        }
    }
}

@Composable
fun TransactionRow(txn: TransactionEntity, onDelete: () -> Unit) {
    val isDebit = txn.type == TransactionType.DEBIT
    val dateStr = SimpleDateFormat("dd MMM, hh:mm a", Locale.getDefault()).format(Date(txn.timestamp))
    var showDeleteConfirm by remember { mutableStateOf(false) }

    Card(
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = txn.vendor,
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.sp,
                        color = Color.White
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Surface(
                        color = if (txn.paymentMode == PaymentMode.CASH) Color(0xFF78350F) else Color(0xFF0C4A6E),
                        shape = RoundedCornerShape(4.dp)
                    ) {
                        Text(
                            text = if (txn.paymentMode == PaymentMode.CASH) "CASH" else "SMS",
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (txn.paymentMode == PaymentMode.CASH) Color(0xFFFDE68A) else Color(0xFFBAE6FD),
                            modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp)
                        )
                    }
                }

                if (!txn.comment.isNullOrBlank()) {
                    Text(
                        text = txn.comment,
                        fontSize = 11.sp,
                        color = Color(0xFF94A3B8),
                        maxLines = 1
                    )
                }

                Text(
                    text = "$dateStr · ${txn.category}",
                    fontSize = 10.sp,
                    color = Color(0xFF64748B)
                )
            }

            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        text = "${if (isDebit) "-" else "+"}₹${String.format("%,.2f", txn.amount)}",
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                        color = if (isDebit) Color(0xFFFB7185) else Color(0xFF34D399)
                    )
                    Text(
                        text = if (isDebit) "DEBIT" else "CREDIT",
                        fontSize = 9.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Color(0xFF64748B)
                    )
                }

                IconButton(
                    onClick = { showDeleteConfirm = true },
                    modifier = Modifier.size(28.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Delete,
                        contentDescription = "Delete Transaction",
                        tint = Color(0xFF94A3B8),
                        modifier = Modifier.size(18.dp)
                    )
                }
            }
        }
    }

    if (showDeleteConfirm) {
        AlertDialog(
            onDismissRequest = { showDeleteConfirm = false },
            title = { Text("Delete Transaction?", fontWeight = FontWeight.Bold, fontSize = 16.sp) },
            text = {
                Text(
                    "Are you sure you want to remove this ${if (isDebit) "expense" else "income"} of ₹${String.format("%,.2f", txn.amount)} for ${txn.vendor} from your ledger?",
                    fontSize = 13.sp,
                    color = Color(0xFFCBD5E1)
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        showDeleteConfirm = false
                        onDelete()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFDC2626))
                ) {
                    Text("Delete", color = Color.White)
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteConfirm = false }) {
                    Text("Cancel", color = Color(0xFF94A3B8))
                }
            }
        )
    }
}

@Composable
fun AddCashDialog(
    onDismiss: () -> Unit,
    onAdd: (Double, TransactionType, String, String, String?) -> Unit
) {
    var amountText by remember { mutableStateOf("") }
    var vendor by remember { mutableStateOf("") }
    var comment by remember { mutableStateOf("") }
    var category by remember { mutableStateOf("Food & Dining") }
    var isDebit by remember { mutableStateOf(true) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Add Cash Spending / Earning", fontWeight = FontWeight.Bold, fontSize = 16.sp) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(
                        onClick = { isDebit = true },
                        colors = ButtonDefaults.buttonColors(containerColor = if (isDebit) Color(0xFFE11D48) else Color(0xFF334155)),
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("Spent (Debit -)")
                    }
                    Button(
                        onClick = { isDebit = false },
                        colors = ButtonDefaults.buttonColors(containerColor = if (!isDebit) Color(0xFF059669) else Color(0xFF334155)),
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("Earned (Credit +)")
                    }
                }

                OutlinedTextField(
                    value = amountText,
                    onValueChange = { amountText = it },
                    label = { Text("Amount (₹)") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = vendor,
                    onValueChange = { vendor = it },
                    label = { Text("Vendor / Payee") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = comment,
                    onValueChange = { comment = it },
                    label = { Text("Comment / Note") },
                    modifier = Modifier.fillMaxWidth()
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val amt = amountText.toDoubleOrNull()
                    if (amt != null && amt > 0.0) {
                        onAdd(amt, if (isDebit) TransactionType.DEBIT else TransactionType.CREDIT, vendor, category, comment)
                    }
                }
            ) {
                Text("Save")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        }
    )
}

@Composable
fun PasteSmsDialog(
    onDismiss: () -> Unit,
    onParse: (String) -> Unit
) {
    var smsText by remember { mutableStateOf("") }
    val validation = remember(smsText) {
        if (smsText.isBlank()) null else com.samsung.spendtracker.receiver.SmsParser.validateAndParse(smsText)
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Paste Bank SMS", fontWeight = FontWeight.Bold, fontSize = 16.sp) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    text = "Paste any bank SMS text (HDFC, SBI, ICICI, Axis, UPI, etc.). Strict filter automatically blocks OTPs, unpaid bill dues, and loan ads from creating false expenses.",
                    fontSize = 12.sp,
                    color = Color(0xFF94A3B8)
                )

                OutlinedTextField(
                    value = smsText,
                    onValueChange = { smsText = it },
                    label = { Text("SMS Content") },
                    placeholder = { Text("e.g. Paid Rs.450.00 to Swiggy on 03-Nov-24 via UPI Ref 4123456789. Avl Bal Rs.25,000") },
                    modifier = Modifier.fillMaxWidth().height(120.dp),
                    maxLines = 5
                )

                if (validation != null) {
                    if (validation.isValid) {
                        Surface(
                            color = Color(0xFF064E3B),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier.padding(8.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(Icons.Default.Check, contentDescription = null, tint = Color(0xFF34D399), modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = "Verified ${validation.detectedType}: ₹${String.format(Locale.getDefault(), "%,.2f", validation.detectedAmount ?: 0.0)} (${validation.entity?.vendor})",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFFA7F3D0)
                                )
                            }
                        }
                    } else {
                        Surface(
                            color = Color(0xFF4C0519),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier.padding(8.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(Icons.Default.Warning, contentDescription = null, tint = Color(0xFFFB7185), modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = validation.reason,
                                    fontSize = 11.sp,
                                    color = Color(0xFFFECDD3)
                                )
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (smsText.isNotBlank() && validation?.isValid == true) {
                        onParse(smsText.trim())
                    }
                },
                enabled = smsText.isNotBlank() && validation?.isValid == true
            ) {
                Text("Parse & Add")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        }
    )
}

@Composable
fun LedgerView(
    transactions: List<TransactionEntity>,
    hasSmsPermission: Boolean,
    onGrantPermission: () -> Unit,
    onDeleteTransaction: (TransactionEntity) -> Unit
) {
    Column(
        modifier = Modifier.fillMaxSize()
    ) {
        if (!hasSmsPermission) {
            Card(
                colors = CardDefaults.cardColors(containerColor = Color(0xFF450A0A)),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp)
            ) {
                Row(
                    modifier = Modifier.padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.Warning, contentDescription = null, tint = Color(0xFFFCA5A5))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Grant SMS permission to automatically track your bank transactions.",
                        fontSize = 12.sp,
                        color = Color(0xFFFCA5A5),
                        modifier = Modifier.weight(1f)
                    )
                    TextButton(onClick = onGrantPermission) {
                        Text("Grant", color = Color.White, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }

        val context = LocalContext.current
        val prefs = remember { context.getSharedPreferences("spendtracker_prefs", Context.MODE_PRIVATE) }
        val cal = remember { Calendar.getInstance() }
        val currentYearStr = remember { cal.get(Calendar.YEAR).toString() }
        val currentMonthInt = remember { cal.get(Calendar.MONTH) + 1 }

        var selectedYear by remember {
            mutableStateOf(prefs.getString("selected_year", currentYearStr) ?: currentYearStr)
        }
        var selectedMonths by remember {
            val savedMonthStrings = prefs.getStringSet("selected_months", null)
            val initial = if (savedMonthStrings != null) {
                savedMonthStrings.mapNotNull { it.toIntOrNull() }.toSet()
            } else {
                setOf(currentMonthInt) // Default to current month instead of all months!
            }
            mutableStateOf(initial)
        }

        fun updateYear(year: String) {
            selectedYear = year
            prefs.edit().putString("selected_year", year).apply()
        }

        fun updateMonths(months: Set<Int>) {
            selectedMonths = months
            prefs.edit().putStringSet("selected_months", months.map { it.toString() }.toSet()).apply()
        }

        val availableYears = remember(transactions) {
            val set = mutableSetOf<String>()
            for (txn in transactions) {
                cal.timeInMillis = txn.timestamp
                set.add(cal.get(Calendar.YEAR).toString())
            }
            set.sortedDescending()
        }

        val filteredTransactions = remember(transactions, selectedYear, selectedMonths) {
            transactions.filter { txn ->
                cal.timeInMillis = txn.timestamp
                val yr = cal.get(Calendar.YEAR).toString()
                val mo = cal.get(Calendar.MONTH) + 1
                val matchesYear = selectedYear == "all" || yr == selectedYear
                val matchesMonth = selectedMonths.isEmpty() || selectedMonths.contains(mo)
                matchesYear && matchesMonth
            }
        }

        val filteredDebits = remember(filteredTransactions) {
            filteredTransactions.filter { it.type == TransactionType.DEBIT }.sumOf { it.amount }
        }
        val filteredCredits = remember(filteredTransactions) {
            filteredTransactions.filter { it.type == TransactionType.CREDIT }.sumOf { it.amount }
        }
        val filteredCashSpent = remember(filteredTransactions) {
            filteredTransactions.filter { it.type == TransactionType.DEBIT && it.paymentMode == PaymentMode.CASH }.sumOf { it.amount }
        }
        val filteredNetBalance = filteredCredits - filteredDebits

        // Summary Card with Year & Multiselect Month Menus
        BalanceSummaryCard(
            netBalance = filteredNetBalance,
            totalDebits = filteredDebits,
            totalCredits = filteredCredits,
            totalCashSpent = filteredCashSpent,
            selectedYear = selectedYear,
            onYearSelected = { updateYear(it) },
            availableYears = availableYears,
            selectedMonths = selectedMonths,
            onToggleMonth = { m ->
                val newSet = if (selectedMonths.contains(m)) {
                    selectedMonths - m
                } else {
                    selectedMonths + m
                }
                updateMonths(newSet)
            },
            onSelectAllMonths = { updateMonths(emptySet()) }
        )

        Spacer(modifier = Modifier.height(14.dp))

        // Section Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Transaction History",
                fontWeight = FontWeight.Bold,
                fontSize = 14.sp,
                color = Color.White
            )
            Text(
                text = "${filteredTransactions.size} records",
                fontSize = 12.sp,
                color = Color(0xFF94A3B8)
            )
        }

        Spacer(modifier = Modifier.height(8.dp))

        val monthFormat = remember { SimpleDateFormat("MMMM yyyy", Locale.getDefault()) }
        val groupedByMonth = remember(filteredTransactions) {
            val map = linkedMapOf<String, MutableList<TransactionEntity>>()
            for (txn in filteredTransactions) {
                val key = monthFormat.format(Date(txn.timestamp))
                map.getOrPut(key) { mutableListOf() }.add(txn)
            }
            map
        }

        // Ledger List Grouped in Months-Year
        if (filteredTransactions.isEmpty()) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "No transactions recorded yet.\n\n📱 Main Phone: New bank SMS are tracked automatically in the background!\n\n🔒 Secure Folder: Tap 'Scan Inbox' above or 'Paste SMS' to import transactions.\n\n💵 Tap (+) to record cash spending.",
                    fontSize = 13.sp,
                    color = Color(0xFF64748B),
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                    lineHeight = 20.sp
                )
            }
        } else {
            val isSingleMonthSelected = selectedMonths.size == 1

            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                if (isSingleMonthSelected) {
                    // Single month selected from top: No month name card, direct list of items
                    items(filteredTransactions, key = { it.id }) { txn ->
                        TransactionRow(txn, onDelete = { onDeleteTransaction(txn) })
                    }
                } else {
                    // Multiple months or all months selected from top: Grouped by month
                    groupedByMonth.forEach { (monthLabel, monthTxns) ->
                        val monthDebit = monthTxns.filter { it.type == TransactionType.DEBIT }.sumOf { it.amount }
                        val monthCredit = monthTxns.filter { it.type == TransactionType.CREDIT }.sumOf { it.amount }

                        item(key = "month_header_$monthLabel") {
                            MonthHeaderRow(
                                monthLabel = monthLabel,
                                totalDebits = monthDebit,
                                totalCredits = monthCredit,
                                count = monthTxns.size
                            )
                        }

                        items(monthTxns, key = { it.id }) { txn ->
                            TransactionRow(txn, onDelete = { onDeleteTransaction(txn) })
                        }
                    }
                }
            }
        }
    }
}

enum class ChannelFilter { ALL, UPI, CASH, ECOMMERCE }

fun getTransactionChannel(txn: TransactionEntity): ChannelFilter {
    if (txn.paymentMode == PaymentMode.CASH) return ChannelFilter.CASH
    val text = "${txn.vendor} ${txn.comment ?: ""} ${txn.accountDetails ?: ""} ${txn.rawSms ?: ""}".lowercase()
    if (txn.paymentMode == PaymentMode.UPI || txn.referenceId?.contains("upi", ignoreCase = true) == true ||
        listOf("upi", "vpa", "gpay", "phonepe", "paytm", "cred").any { text.contains(it) }) {
        return ChannelFilter.UPI
    }
    if (txn.paymentMode == PaymentMode.CARD ||
        listOf("amazon", "flipkart", "myntra", "card", "pos", "ecommerce", "online", "netbanking").any { text.contains(it) }) {
        return ChannelFilter.ECOMMERCE
    }
    if (listOf("swiggy", "zomato", "blinkit", "zepto").any { text.contains(it) }) {
        return ChannelFilter.UPI
    }
    return ChannelFilter.ECOMMERCE
}

@Composable
fun AnalyticsScreen(
    transactions: List<TransactionEntity>
) {
    val cal = remember { Calendar.getInstance() }
    val currentYearStr = remember { cal.get(Calendar.YEAR).toString() }

    var selectedYear by remember { mutableStateOf(currentYearStr) }
    var selectedMonths by remember { mutableStateOf<Set<Int>>(emptySet()) } // emptySet = All Months Combined
    var channelFilter by remember { mutableStateOf(ChannelFilter.ALL) }

    val availableYears = remember(transactions) {
        val set = mutableSetOf<String>()
        for (txn in transactions) {
            cal.timeInMillis = txn.timestamp
            set.add(cal.get(Calendar.YEAR).toString())
        }
        set.sortedDescending()
    }

    val filteredTransactions = remember(transactions, selectedYear, selectedMonths) {
        transactions.filter { txn ->
            cal.timeInMillis = txn.timestamp
            val yr = cal.get(Calendar.YEAR).toString()
            val mo = cal.get(Calendar.MONTH) + 1
            val matchesYear = selectedYear == "all" || yr == selectedYear
            val matchesMonth = selectedMonths.isEmpty() || selectedMonths.contains(mo)
            matchesYear && matchesMonth
        }
    }

    val totalCredits = remember(filteredTransactions) {
        filteredTransactions.filter { it.type == TransactionType.CREDIT }.sumOf { it.amount }
    }
    val totalDebits = remember(filteredTransactions) {
        filteredTransactions.filter { it.type == TransactionType.DEBIT }.sumOf { it.amount }
    }

    // Channels calculations
    val upiSpent = remember(filteredTransactions) {
        filteredTransactions.filter { it.type == TransactionType.DEBIT && getTransactionChannel(it) == ChannelFilter.UPI }.sumOf { it.amount }
    }
    val upiCount = remember(filteredTransactions) {
        filteredTransactions.count { it.type == TransactionType.DEBIT && getTransactionChannel(it) == ChannelFilter.UPI }
    }
    val cashSpent = remember(filteredTransactions) {
        filteredTransactions.filter { it.type == TransactionType.DEBIT && getTransactionChannel(it) == ChannelFilter.CASH }.sumOf { it.amount }
    }
    val cashCount = remember(filteredTransactions) {
        filteredTransactions.count { it.type == TransactionType.DEBIT && getTransactionChannel(it) == ChannelFilter.CASH }
    }
    val ecomSpent = remember(filteredTransactions) {
        filteredTransactions.filter { it.type == TransactionType.DEBIT && getTransactionChannel(it) == ChannelFilter.ECOMMERCE }.sumOf { it.amount }
    }
    val ecomCount = remember(filteredTransactions) {
        filteredTransactions.count { it.type == TransactionType.DEBIT && getTransactionChannel(it) == ChannelFilter.ECOMMERCE }
    }

    val savingsRate = if (totalCredits > 0) {
        (((totalCredits - totalDebits) / totalCredits) * 100).toInt()
    } else 0

    // Group debits by category and channel
    val categoryTotals = remember(filteredTransactions, channelFilter) {
        val debits = filteredTransactions.filter { it.type == TransactionType.DEBIT }
        val sumTotal = debits.sumOf { it.amount }
        val grouped = debits.groupBy { it.category }

        grouped.mapNotNull { (category, txns) ->
            val uAmt = txns.filter { getTransactionChannel(it) == ChannelFilter.UPI }.sumOf { it.amount }
            val cAmt = txns.filter { getTransactionChannel(it) == ChannelFilter.CASH }.sumOf { it.amount }
            val eAmt = txns.filter { getTransactionChannel(it) == ChannelFilter.ECOMMERCE }.sumOf { it.amount }

            val displayAmt = when (channelFilter) {
                ChannelFilter.ALL -> txns.sumOf { it.amount }
                ChannelFilter.UPI -> uAmt
                ChannelFilter.CASH -> cAmt
                ChannelFilter.ECOMMERCE -> eAmt
            }

            if (displayAmt > 0) {
                val pct = if (sumTotal > 0) (displayAmt / sumTotal * 100).toFloat() else 0f
                CategoryAnalyticsItem(category, displayAmt, pct, uAmt, cAmt, eAmt, txns.size)
            } else null
        }.sortedByDescending { it.amount }
    }

    LazyColumn(
        verticalArrangement = Arrangement.spacedBy(14.dp),
        modifier = Modifier.fillMaxSize()
    ) {
        // Top Period Filter Card (Selectable Year, Month, All Months Combined)
        item {
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF111827)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "ANALYTICS & INSIGHTS",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF94A3B8)
                        )

                        // Selectable Year Dropdown
                        Box {
                            var yearExpanded by remember { mutableStateOf(false) }
                            Surface(
                                color = Color(0xFF1E293B),
                                shape = RoundedCornerShape(8.dp),
                                modifier = Modifier.clickable { yearExpanded = true }
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                ) {
                                    Text(
                                        text = if (selectedYear == "all") "All Years" else selectedYear,
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color.White
                                    )
                                    Icon(Icons.Default.ArrowDropDown, contentDescription = null, tint = Color(0xFF94A3B8), modifier = Modifier.size(16.dp))
                                }
                            }
                            DropdownMenu(
                                expanded = yearExpanded,
                                onDismissRequest = { yearExpanded = false }
                            ) {
                                DropdownMenuItem(
                                    text = { Text("All Years") },
                                    onClick = {
                                        selectedYear = "all"
                                        yearExpanded = false
                                    }
                                )
                                availableYears.forEach { yr ->
                                    DropdownMenuItem(
                                        text = { Text(yr) },
                                        onClick = {
                                            selectedYear = yr
                                            yearExpanded = false
                                        }
                                    )
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    // Months selection row with All Months Combined button
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Surface(
                            color = if (selectedMonths.isEmpty()) Color(0xFF0284C7) else Color(0xFF1E293B),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.clickable { selectedMonths = emptySet() }
                        ) {
                            Text(
                                text = "All Months Combined",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (selectedMonths.isEmpty()) Color.White else Color(0xFF94A3B8),
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            )
                        }

                        // Specific Month Dropdown
                        Box {
                            var monthExpanded by remember { mutableStateOf(false) }
                            val monthNames = listOf("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")
                            val label = when {
                                selectedMonths.isEmpty() -> "Select Month"
                                selectedMonths.size == 1 -> monthNames.getOrElse(selectedMonths.first() - 1) { "1 Month" }
                                else -> "${selectedMonths.size} Months"
                            }

                            Surface(
                                color = if (selectedMonths.isNotEmpty()) Color(0xFF0C4A6E) else Color(0xFF1E293B),
                                shape = RoundedCornerShape(8.dp),
                                modifier = Modifier.clickable { monthExpanded = true }
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                ) {
                                    Icon(Icons.Default.DateRange, contentDescription = null, tint = Color(0xFF38BDF8), modifier = Modifier.size(13.dp))
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text(
                                        text = label,
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = if (selectedMonths.isNotEmpty()) Color(0xFF38BDF8) else Color.White
                                    )
                                    Icon(Icons.Default.ArrowDropDown, contentDescription = null, tint = Color(0xFF94A3B8), modifier = Modifier.size(16.dp))
                                }
                            }

                            DropdownMenu(
                                expanded = monthExpanded,
                                onDismissRequest = { monthExpanded = false }
                            ) {
                                DropdownMenuItem(
                                    text = { Text("All Months Combined") },
                                    onClick = {
                                        selectedMonths = emptySet()
                                        monthExpanded = false
                                    }
                                )
                                HorizontalDivider()
                                monthNames.forEachIndexed { idx, name ->
                                    val mIdx = idx + 1
                                    val isSelected = selectedMonths.contains(mIdx)
                                    DropdownMenuItem(
                                        text = {
                                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                                Text(name)
                                                if (isSelected) {
                                                    Icon(Icons.Default.Check, contentDescription = null, tint = Color(0xFF38BDF8), modifier = Modifier.size(16.dp))
                                                }
                                            }
                                        },
                                        onClick = {
                                            selectedMonths = if (isSelected) selectedMonths - mIdx else selectedMonths + mIdx
                                        }
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        // Financial Health Card
        item {
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF111827)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "SAVINGS & SPENDING HEALTH",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF94A3B8)
                        )
                        Text(
                            text = "$savingsRate% Net Savings",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF38BDF8)
                        )
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    val totalFlow = totalCredits + totalDebits
                    val debitProgress = if (totalFlow > 0) (totalDebits / totalFlow).toFloat() else 0.5f

                    LinearProgressIndicator(
                        progress = { debitProgress },
                        modifier = Modifier.fillMaxWidth().height(8.dp),
                        color = Color(0xFFFB7185),
                        trackColor = Color(0xFF34D399)
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = "Debits: -₹${"%,.0f".format(totalDebits)}",
                            fontSize = 11.sp,
                            color = Color(0xFFFB7185),
                            fontWeight = FontWeight.SemiBold
                        )
                        Text(
                            text = "Credits: +₹${"%,.0f".format(totalCredits)}",
                            fontSize = 11.sp,
                            color = Color(0xFF34D399),
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }
            }
        }

        // PAYMENT CHANNELS: UPI, CASH, E-COMMERCE
        item {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    text = "TRANSACTION CHANNELS",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF94A3B8)
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // UPI Card
                    Card(
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = if (channelFilter == ChannelFilter.UPI) Color(0xFF3B0764) else Color(0xFF111827)
                        ),
                        modifier = Modifier.weight(1f).clickable {
                            channelFilter = if (channelFilter == ChannelFilter.UPI) ChannelFilter.ALL else ChannelFilter.UPI
                        }
                    ) {
                        Column(modifier = Modifier.padding(10.dp)) {
                            Text("UPI", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color(0xFFC084FC))
                            Spacer(modifier = Modifier.height(4.dp))
                            Text("₹${"%,.0f".format(upiSpent)}", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color.White)
                            Text("$upiCount txns", fontSize = 9.sp, color = Color(0xFF94A3B8))
                        }
                    }

                    // Cash Card
                    Card(
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = if (channelFilter == ChannelFilter.CASH) Color(0xFF451A03) else Color(0xFF111827)
                        ),
                        modifier = Modifier.weight(1f).clickable {
                            channelFilter = if (channelFilter == ChannelFilter.CASH) ChannelFilter.ALL else ChannelFilter.CASH
                        }
                    ) {
                        Column(modifier = Modifier.padding(10.dp)) {
                            Text("CASH", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color(0xFFFBBF24))
                            Spacer(modifier = Modifier.height(4.dp))
                            Text("₹${"%,.0f".format(cashSpent)}", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color.White)
                            Text("$cashCount txns", fontSize = 9.sp, color = Color(0xFF94A3B8))
                        }
                    }

                    // E-Commerce Card
                    Card(
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = if (channelFilter == ChannelFilter.ECOMMERCE) Color(0xFF0C4A6E) else Color(0xFF111827)
                        ),
                        modifier = Modifier.weight(1f).clickable {
                            channelFilter = if (channelFilter == ChannelFilter.ECOMMERCE) ChannelFilter.ALL else ChannelFilter.ECOMMERCE
                        }
                    ) {
                        Column(modifier = Modifier.padding(10.dp)) {
                            Text("E-COMM", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color(0xFF38BDF8))
                            Spacer(modifier = Modifier.height(4.dp))
                            Text("₹${"%,.0f".format(ecomSpent)}", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color.White)
                            Text("$ecomCount txns", fontSize = 9.sp, color = Color(0xFF94A3B8))
                        }
                    }
                }
            }
        }

        // Category breakdown card with UPI, Cash, E-Commerce Sub-Breakdown
        item {
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF111827)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("SPENDING BY CATEGORY", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.White)

                        // Channel filter pills
                        Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            Surface(
                                color = if (channelFilter == ChannelFilter.ALL) Color(0xFF0284C7) else Color(0xFF1E293B),
                                shape = RoundedCornerShape(6.dp),
                                modifier = Modifier.clickable { channelFilter = ChannelFilter.ALL }
                            ) {
                                Text("All", fontSize = 9.sp, color = Color.White, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                            }
                            Surface(
                                color = if (channelFilter == ChannelFilter.UPI) Color(0xFF9333EA) else Color(0xFF1E293B),
                                shape = RoundedCornerShape(6.dp),
                                modifier = Modifier.clickable { channelFilter = ChannelFilter.UPI }
                            ) {
                                Text("UPI", fontSize = 9.sp, color = Color.White, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                            }
                            Surface(
                                color = if (channelFilter == ChannelFilter.CASH) Color(0xFFD97706) else Color(0xFF1E293B),
                                shape = RoundedCornerShape(6.dp),
                                modifier = Modifier.clickable { channelFilter = ChannelFilter.CASH }
                            ) {
                                Text("Cash", fontSize = 9.sp, color = Color.White, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                            }
                            Surface(
                                color = if (channelFilter == ChannelFilter.ECOMMERCE) Color(0xFF0284C7) else Color(0xFF1E293B),
                                shape = RoundedCornerShape(6.dp),
                                modifier = Modifier.clickable { channelFilter = ChannelFilter.ECOMMERCE }
                            ) {
                                Text("E-Comm", fontSize = 9.sp, color = Color.White, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    if (categoryTotals.isEmpty()) {
                        Text("No debit transactions match this period and channel filter.", fontSize = 12.sp, color = Color(0xFF64748B))
                    } else {
                        categoryTotals.forEach { item ->
                            Column(modifier = Modifier.fillMaxWidth().padding(vertical = 5.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text(item.category, fontSize = 12.sp, color = Color(0xFFCBD5E1), fontWeight = FontWeight.Medium)
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Text("₹${"%,.2f".format(item.amount)}", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.White)
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Text("${item.pct.toInt()}%", fontSize = 10.sp, color = Color(0xFF94A3B8))
                                    }
                                }
                                Spacer(modifier = Modifier.height(4.dp))
                                LinearProgressIndicator(
                                    progress = { item.pct / 100f },
                                    modifier = Modifier.fillMaxWidth().height(6.dp),
                                    color = Color(0xFF0284C7),
                                    trackColor = Color(0xFF1E293B)
                                )

                                // Channel Sub-Breakdown Tags
                                Spacer(modifier = Modifier.height(4.dp))
                                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                    if (item.upi > 0) {
                                        Text("UPI: ₹${"%,.0f".format(item.upi)}", fontSize = 9.sp, color = Color(0xFFC084FC))
                                    }
                                    if (item.cash > 0) {
                                        Text("Cash: ₹${"%,.0f".format(item.cash)}", fontSize = 9.sp, color = Color(0xFFFBBF24))
                                    }
                                    if (item.ecom > 0) {
                                        Text("E-Comm: ₹${"%,.0f".format(item.ecom)}", fontSize = 9.sp, color = Color(0xFF38BDF8))
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

data class CategoryAnalyticsItem(
    val category: String,
    val amount: Double,
    val pct: Float,
    val upi: Double,
    val cash: Double,
    val ecom: Double,
    val count: Int
)

@Composable
fun SmsSyncScreen(
    hasPermission: Boolean,
    isScanning: Boolean,
    onGrantPermission: () -> Unit,
    onScanInbox: () -> Unit,
    onPasteSms: () -> Unit
) {
    var showPatternSettings by remember { mutableStateOf(false) }
    var filterOtp by remember { mutableStateOf(com.samsung.spendtracker.receiver.SmsParser.activeConfig.filterOtp) }
    var filterBillDues by remember { mutableStateOf(com.samsung.spendtracker.receiver.SmsParser.activeConfig.filterBillDues) }
    var filterPromos by remember { mutableStateOf(com.samsung.spendtracker.receiver.SmsParser.activeConfig.filterPromos) }
    var filterBalanceInquiry by remember { mutableStateOf(com.samsung.spendtracker.receiver.SmsParser.activeConfig.filterBalanceInquiry) }
    var requireActionVerb by remember { mutableStateOf(com.samsung.spendtracker.receiver.SmsParser.activeConfig.requireActionVerb) }
    var requireAccountAnchor by remember { mutableStateOf(com.samsung.spendtracker.receiver.SmsParser.activeConfig.requireAccountAnchor) }
    var customExclusionsText by remember { mutableStateOf(com.samsung.spendtracker.receiver.SmsParser.activeConfig.customExclusions.joinToString(", ")) }

    fun updateConfig() {
        val exclusions = customExclusionsText.split(",").map { it.trim() }.filter { it.isNotEmpty() }
        com.samsung.spendtracker.receiver.SmsParser.activeConfig = com.samsung.spendtracker.receiver.SmsFilterConfig(
            filterOtp = filterOtp,
            filterBillDues = filterBillDues,
            filterPromos = filterPromos,
            filterBalanceInquiry = filterBalanceInquiry,
            requireActionVerb = requireActionVerb,
            requireAccountAnchor = requireAccountAnchor,
            customExclusions = exclusions
        )
    }

    var testSmsText by remember {
        mutableStateOf("HDFC Bank: Rs. 450.00 debited from A/c **4012 on 03-Nov-24 to SWIGGY. UPI Ref: 4123456789. Avl Bal Rs.25,000.")
    }

    val testResult = remember(testSmsText, filterOtp, filterBillDues, filterPromos, filterBalanceInquiry, requireActionVerb, requireAccountAnchor, customExclusionsText) {
        val exclusions = customExclusionsText.split(",").map { it.trim() }.filter { it.isNotEmpty() }
        val cfg = com.samsung.spendtracker.receiver.SmsFilterConfig(
            filterOtp = filterOtp,
            filterBillDues = filterBillDues,
            filterPromos = filterPromos,
            filterBalanceInquiry = filterBalanceInquiry,
            requireActionVerb = requireActionVerb,
            requireAccountAnchor = requireAccountAnchor,
            customExclusions = exclusions
        )
        com.samsung.spendtracker.receiver.SmsParser.validateAndParse(testSmsText, config = cfg)
    }

    LazyColumn(
        verticalArrangement = Arrangement.spacedBy(14.dp),
        modifier = Modifier.fillMaxSize()
    ) {
        item {
            Text(
                text = "SMS Sync & Pattern Rules",
                fontWeight = FontWeight.Bold,
                fontSize = 18.sp,
                color = Color.White
            )
        }

        // Auto-SMS Receiver Card
        item {
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF111827)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(18.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Surface(
                        color = Color(0xFF0C4A6E),
                        shape = CircleShape,
                        modifier = Modifier.size(50.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(Icons.Default.Sms, contentDescription = null, tint = Color(0xFF38BDF8), modifier = Modifier.size(26.dp))
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    Text(
                        text = "Samsung Auto-SMS Receiver",
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp,
                        color = Color.White
                    )

                    Surface(
                        color = Color(0xFF064E3B),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.padding(top = 4.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.Check, contentDescription = null, tint = Color(0xFF34D399), modifier = Modifier.size(12.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Strict Anti-False-Positive Filter Active", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color(0xFFA7F3D0))
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    Text(
                        text = "BroadcastReceiver listens for incoming bank debits & credits in the background. False expenses (OTPs, unpaid bills, loan offers) are filtered out.",
                        fontSize = 12.sp,
                        color = Color(0xFF94A3B8),
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                        lineHeight = 17.sp
                    )

                    Spacer(modifier = Modifier.height(10.dp))

                    Surface(
                        color = Color(0xFF064E3B).copy(alpha = 0.5f),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.padding(10.dp),
                            verticalAlignment = Alignment.Top
                        ) {
                            Icon(Icons.Default.Check, contentDescription = null, tint = Color(0xFF34D399), modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "100% Read-Only Safety: SpendTracker never deletes, dismisses, or modifies your SMS messages or bank notifications. All texts stay permanently in Samsung Messages / Google Messages.",
                                fontSize = 11.sp,
                                color = Color(0xFFA7F3D0),
                                lineHeight = 15.sp
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Button(
                            onClick = onScanInbox,
                            enabled = !isScanning,
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0284C7)),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            if (isScanning) {
                                CircularProgressIndicator(modifier = Modifier.size(16.dp), color = Color.White, strokeWidth = 2.dp)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Scanning...", fontSize = 12.sp)
                            } else {
                                Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Scan Inbox", fontSize = 12.sp)
                            }
                        }

                        OutlinedButton(
                            onClick = onPasteSms,
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFA78BFA)),
                            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF6D28D9)),
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(Icons.Default.Email, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Paste SMS", fontSize = 12.sp)
                        }
                    }
                }
            }
        }

        // Pattern Rules & Anti-False-Positive Filters Card
        item {
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF111827)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Settings, contentDescription = null, tint = Color(0xFF38BDF8), modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("SMS PATTERN RULES & FILTERS", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.White)
                        }
                        TextButton(onClick = { showPatternSettings = !showPatternSettings }) {
                            Text(if (showPatternSettings) "Collapse" else "Customize", fontSize = 11.sp, color = Color(0xFF38BDF8))
                        }
                    }

                    Text(
                        text = "Customize pattern detection rules to prevent false entries when amount is mentioned in non-expense SMS.",
                        fontSize = 11.sp,
                        color = Color(0xFF94A3B8),
                        lineHeight = 16.sp
                    )

                    if (showPatternSettings) {
                        Spacer(modifier = Modifier.height(12.dp))
                        HorizontalDivider(color = Color(0xFF1E293B))
                        Spacer(modifier = Modifier.height(10.dp))

                        // Toggle 1: OTP
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text("Block OTP & Security Codes", fontSize = 12.sp, color = Color.White, fontWeight = FontWeight.SemiBold)
                                Text("Ignores 'OTP for Rs 500 is 123456'", fontSize = 10.sp, color = Color(0xFF64748B))
                            }
                            Switch(
                                checked = filterOtp,
                                onCheckedChange = {
                                    filterOtp = it
                                    updateConfig()
                                }
                            )
                        }

                        // Toggle 2: Bill Due
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text("Block Unpaid Bill Dues & Notices", fontSize = 12.sp, color = Color.White, fontWeight = FontWeight.SemiBold)
                                Text("Ignores 'Bill of Rs 1499 is due on 20-Nov'", fontSize = 10.sp, color = Color(0xFF64748B))
                            }
                            Switch(
                                checked = filterBillDues,
                                onCheckedChange = {
                                    filterBillDues = it
                                    updateConfig()
                                }
                            )
                        }

                        // Toggle 3: Promos
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text("Block Promotional Loan/Card Offers", fontSize = 12.sp, color = Color.White, fontWeight = FontWeight.SemiBold)
                                Text("Ignores 'Pre-approved loan of Rs 5,00,000'", fontSize = 10.sp, color = Color(0xFF64748B))
                            }
                            Switch(
                                checked = filterPromos,
                                onCheckedChange = {
                                    filterPromos = it
                                    updateConfig()
                                }
                            )
                        }

                        // Toggle 4: Balance Alerts
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text("Block Balance Inquiries", fontSize = 12.sp, color = Color.White, fontWeight = FontWeight.SemiBold)
                                Text("Ignores 'Avail Bal in A/c is Rs 25,000'", fontSize = 10.sp, color = Color(0xFF64748B))
                            }
                            Switch(
                                checked = filterBalanceInquiry,
                                onCheckedChange = {
                                    filterBalanceInquiry = it
                                    updateConfig()
                                }
                            )
                        }

                        // Toggle 5: Require Action Verb
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text("Require Confirmed Action Verb", fontSize = 12.sp, color = Color.White, fontWeight = FontWeight.SemiBold)
                                Text("Requires 'debited', 'paid to', 'credited', 'withdrawn'", fontSize = 10.sp, color = Color(0xFF64748B))
                            }
                            Switch(
                                checked = requireActionVerb,
                                onCheckedChange = {
                                    requireActionVerb = it
                                    updateConfig()
                                }
                            )
                        }

                        // Toggle 6: Require Account Anchor
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text("Require Account / Card / UPI Anchor", fontSize = 12.sp, color = Color.White, fontWeight = FontWeight.SemiBold)
                                Text("Requires A/c XX1234, Card, or UPI Ref in message", fontSize = 10.sp, color = Color(0xFF64748B))
                            }
                            Switch(
                                checked = requireAccountAnchor,
                                onCheckedChange = {
                                    requireAccountAnchor = it
                                    updateConfig()
                                }
                            )
                        }

                        Spacer(modifier = Modifier.height(6.dp))

                        OutlinedTextField(
                            value = customExclusionsText,
                            onValueChange = {
                                customExclusionsText = it
                                updateConfig()
                            },
                            label = { Text("Custom Exclusions (Comma Separated)") },
                            placeholder = { Text("e.g. loan, offer, scratch card, reward") },
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                }
            }
        }

        // Interactive Live Pattern Tester Card
        item {
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF111827)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.PlayArrow, contentDescription = null, tint = Color(0xFFFBBF24), modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("INTERACTIVE PATTERN TESTER", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    }

                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "Tap sample buttons or paste custom SMS to see instant diagnostic validation:",
                        fontSize = 11.sp,
                        color = Color(0xFF94A3B8)
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    // Sample Chips
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Surface(
                            color = Color(0xFF0C4A6E),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.clickable {
                                testSmsText = "HDFC Bank: Rs. 450.00 debited from A/c **4012 on 03-Nov-24 to SWIGGY. UPI Ref: 4123456789. Avl Bal Rs.25,000."
                            }
                        ) {
                            Text("✓ Bank Debit", fontSize = 10.sp, color = Color(0xFF38BDF8), modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp))
                        }

                        Surface(
                            color = Color(0xFF4C0519),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.clickable {
                                testSmsText = "Your OTP for payment of Rs. 450.00 at Swiggy is 928371. Do not share with anyone."
                            }
                        ) {
                            Text("✗ Fake OTP", fontSize = 10.sp, color = Color(0xFFFB7185), modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp))
                        }

                        Surface(
                            color = Color(0xFF451A03),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.clickable {
                                testSmsText = "Dear Customer, bill of Rs. 1,499.00 is due on 20-Nov-24. Pay now to avoid penalty."
                            }
                        ) {
                            Text("✗ Fake Bill Due", fontSize = 10.sp, color = Color(0xFFFBBF24), modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp))
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    OutlinedTextField(
                        value = testSmsText,
                        onValueChange = { testSmsText = it },
                        label = { Text("Test SMS Text") },
                        modifier = Modifier.fillMaxWidth().height(100.dp),
                        maxLines = 4
                    )

                    Spacer(modifier = Modifier.height(10.dp))

                    if (testResult.isValid) {
                        Surface(
                            color = Color(0xFF064E3B),
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(10.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.Check, contentDescription = null, tint = Color(0xFF34D399), modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text("PASSED — Confirmed Bank Transaction", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color(0xFFA7F3D0))
                                }
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = "Extracted: ${testResult.detectedType} ₹${String.format(Locale.getDefault(), "%,.2f", testResult.detectedAmount ?: 0.0)} | Vendor: ${testResult.entity?.vendor} | Category: ${testResult.entity?.category}",
                                    fontSize = 11.sp,
                                    color = Color(0xFFD1FAE5)
                                )
                            }
                        }
                    } else {
                        Surface(
                            color = Color(0xFF4C0519),
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(10.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.Warning, contentDescription = null, tint = Color(0xFFFB7185), modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text("BLOCKED — False Expense Prevented", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color(0xFFFECDD3))
                                }
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = testResult.reason,
                                    fontSize = 11.sp,
                                    color = Color(0xFFFFE4E6)
                                )
                            }
                        }
                    }
                }
            }
        }

        // Secure Folder Guide Card
        item {
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(modifier = Modifier.padding(16.dp)) {
                    Icon(Icons.Default.Security, contentDescription = null, tint = Color(0xFFFBBF24), modifier = Modifier.size(24.dp))
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text(
                            text = "Samsung Secure Folder Guide",
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp,
                            color = Color(0xFFFBBF24)
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "If running inside Samsung Secure Folder, Android isolates live SMS broadcasts. Use 'Scan SMS Inbox' or 'Paste SMS' above to import bank transactions instantly!",
                            fontSize = 12.sp,
                            color = Color(0xFF94A3B8),
                            lineHeight = 17.sp
                        )
                    }
                }
            }
        }

        // SMS Permissions Card
        item {
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF111827)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("SMS Permissions", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color.White)
                        Text(
                            text = if (hasPermission) "RECEIVE_SMS & READ_SMS Active" else "Permissions Not Granted",
                            fontSize = 11.sp,
                            color = if (hasPermission) Color(0xFF10B981) else Color(0xFFF43F5E)
                        )
                    }
                    if (!hasPermission) {
                        Button(
                            onClick = onGrantPermission,
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0284C7)),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Text("Grant", fontSize = 12.sp)
                        }
                    } else {
                        Icon(Icons.Default.Check, contentDescription = null, tint = Color(0xFF10B981))
                    }
                }
            }
        }
    }
}

@Composable
fun SettingsScreen(
    onResetSampleData: () -> Unit,
    onClearAll: () -> Unit
) {
    var currency by remember { mutableStateOf("₹") }
    var hapticsEnabled by remember { mutableStateOf(true) }
    var showClearConfirm by remember { mutableStateOf(false) }

    LazyColumn(
        verticalArrangement = Arrangement.spacedBy(14.dp),
        modifier = Modifier.fillMaxSize()
    ) {
        item {
            Text(
                text = "Settings & Data",
                fontWeight = FontWeight.Bold,
                fontSize = 18.sp,
                color = Color.White
            )
        }

        // Preferences
        item {
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF111827)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("PREFERENCES", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color(0xFF94A3B8))
                    Spacer(modifier = Modifier.height(10.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Currency Symbol", fontSize = 13.sp, color = Color.White)
                        var expanded by remember { mutableStateOf(false) }
                        Box {
                            Surface(
                                color = Color(0xFF1E293B),
                                shape = RoundedCornerShape(8.dp),
                                modifier = Modifier.clickable { expanded = true }
                            ) {
                                Text(
                                    text = when (currency) {
                                        "₹" -> "₹ (INR)"
                                        "$" -> "$ (USD)"
                                        "€" -> "€ (EUR)"
                                        else -> "£ (GBP)"
                                    },
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White,
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                                )
                            }
                            DropdownMenu(
                                expanded = expanded,
                                onDismissRequest = { expanded = false },
                                modifier = Modifier.background(Color(0xFF1E293B))
                            ) {
                                listOf("₹" to "₹ (INR)", "$" to "$ (USD)", "€" to "€ (EUR)", "£" to "£ (GBP)").forEach { (sym, label) ->
                                    DropdownMenuItem(
                                        text = { Text(label, color = Color.White) },
                                        onClick = {
                                            currency = sym
                                            expanded = false
                                        }
                                    )
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Haptic Feedback on Click", fontSize = 13.sp, color = Color.White)
                        Switch(
                            checked = hapticsEnabled,
                            onCheckedChange = { hapticsEnabled = it },
                            colors = SwitchDefaults.colors(
                                checkedThumbColor = Color.White,
                                checkedTrackColor = Color(0xFF0284C7),
                                uncheckedThumbColor = Color(0xFF94A3B8),
                                uncheckedTrackColor = Color(0xFF1E293B)
                            )
                        )
                    }
                }
            }
        }

        // Native Keystore Info
        item {
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF111827)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Security, contentDescription = null, tint = Color(0xFF10B981), modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("NATIVE RELEASE KEYSTORE", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    }
                    Spacer(modifier = Modifier.height(10.dp))
                    Surface(
                        color = Color(0xFF0F172A),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text("Package: com.samsung.spendtracker", fontSize = 11.sp, color = Color(0xFF94A3B8))
                            Text("Keystore: android/keystore/release.keystore", fontSize = 11.sp, color = Color(0xFF94A3B8))
                            Text("Alias: release_key", fontSize = 11.sp, color = Color(0xFF94A3B8))
                            Text("Password: spendtracker123", fontSize = 11.sp, color = Color(0xFF94A3B8))
                            Text("Validity: Valid until year 2054", fontSize = 11.sp, color = Color(0xFF10B981), fontWeight = FontWeight.SemiBold)
                        }
                    }
                }
            }
        }

        // Device Hardware (Dynamic Build Info) Card
        item {
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF111827)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.PhoneAndroid, contentDescription = null, tint = Color(0xFF38BDF8), modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("DEVICE HARDWARE (READ DYNAMICALLY)", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    }
                    Spacer(modifier = Modifier.height(10.dp))
                    Surface(
                        color = Color(0xFF0F172A),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text("Model (Build.MODEL): ${Build.MODEL}", fontSize = 11.sp, color = Color.White)
                            Text("Manufacturer: ${Build.MANUFACTURER}", fontSize = 11.sp, color = Color(0xFF94A3B8))
                            Text("Brand / Device: ${Build.BRAND} / ${Build.DEVICE}", fontSize = 11.sp, color = Color(0xFF94A3B8))
                            Text("Android OS: ${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT})", fontSize = 11.sp, color = Color(0xFF34D399), fontWeight = FontWeight.SemiBold)
                            Text("Banner Source: Dynamically read from android.os.Build", fontSize = 10.sp, color = Color(0xFF38BDF8))
                        }
                    }
                }
            }
        }

        // Reset Data Card
        item {
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF111827)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("RESET & SAMPLE DATA", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color(0xFFFB7185))
                    Spacer(modifier = Modifier.height(12.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        OutlinedButton(
                            onClick = onResetSampleData,
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("Reset Samples", fontSize = 12.sp, color = Color(0xFFCBD5E1))
                        }

                        Button(
                            onClick = { showClearConfirm = true },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF881337)),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("Clear All", fontSize = 12.sp, color = Color(0xFFFECDD3))
                        }
                    }
                }
            }
        }
    }

    if (showClearConfirm) {
        AlertDialog(
            onDismissRequest = { showClearConfirm = false },
            title = { Text("Clear All Transactions?") },
            text = { Text("This will permanently delete all records from your local Room database. This action cannot be undone.") },
            confirmButton = {
                Button(
                    onClick = {
                        onClearAll()
                        showClearConfirm = false
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFE11D48))
                ) {
                    Text("Delete Everything")
                }
            },
            dismissButton = {
                TextButton(onClick = { showClearConfirm = false }) {
                    Text("Cancel")
                }
            }
        )
    }
}

