package com.samsung.spendtracker

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainScreen(viewModel: SpendTrackerViewModel) {
    val context = LocalContext.current
    val uiState by viewModel.uiState.collectAsState()

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
                                    text = "Samsung A57",
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
                                viewModel.scanInbox(context) { count ->
                                    isScanning = false
                                    coroutineScope.launch {
                                        if (count > 0) {
                                            snackbarHostState.showSnackbar("Found and imported $count bank transaction(s)!")
                                        } else {
                                            snackbarHostState.showSnackbar("Scan complete. No new bank SMS found.")
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
        floatingActionButton = {
            FloatingActionButton(
                onClick = { showAddDialog = true },
                containerColor = Color(0xFF0284C7),
                contentColor = Color.White,
                shape = CircleShape
            ) {
                Icon(Icons.Default.Add, contentDescription = "Add Cash Spend")
            }
        },
        containerColor = Color(0xFF090D16)
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(horizontal = 16.dp)
        ) {
            // Permission Banner (if not granted)
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
                        TextButton(onClick = {
                            permissionLauncher.launch(arrayOf(Manifest.permission.RECEIVE_SMS, Manifest.permission.READ_SMS))
                        }) {
                            Text("Grant", color = Color.White, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }

            // Summary Card
            BalanceSummaryCard(uiState)

            Spacer(modifier = Modifier.height(12.dp))

            // Quick Actions: Scan Inbox & Paste SMS
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                OutlinedButton(
                    onClick = {
                        if (!hasSmsPermission) {
                            permissionLauncher.launch(arrayOf(Manifest.permission.RECEIVE_SMS, Manifest.permission.READ_SMS))
                        } else {
                            isScanning = true
                            viewModel.scanInbox(context) { count ->
                                isScanning = false
                                coroutineScope.launch {
                                    if (count > 0) {
                                        snackbarHostState.showSnackbar("Found and imported $count bank transaction(s)!")
                                    } else {
                                        snackbarHostState.showSnackbar("Scan complete. No new bank SMS found.")
                                    }
                                }
                            }
                        }
                    },
                    modifier = Modifier.weight(1f),
                    colors = ButtonDefaults.outlinedButtonColors(
                        contentColor = Color(0xFF38BDF8)
                    ),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    if (isScanning) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(16.dp),
                            color = Color(0xFF38BDF8),
                            strokeWidth = 2.dp
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Scanning...", fontSize = 12.sp)
                    } else {
                        Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Scan Inbox", fontSize = 12.sp)
                    }
                }

                OutlinedButton(
                    onClick = { showPasteSmsDialog = true },
                    modifier = Modifier.weight(1f),
                    colors = ButtonDefaults.outlinedButtonColors(
                        contentColor = Color(0xFFA78BFA)
                    ),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Icon(Icons.Default.Email, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Paste SMS", fontSize = 12.sp)
                }
            }

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
                    text = "${uiState.transactions.size} records",
                    fontSize = 12.sp,
                    color = Color(0xFF94A3B8)
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Ledger List
            if (uiState.transactions.isEmpty()) {
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
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.fillMaxSize()
                ) {
                    items(uiState.transactions, key = { it.id }) { txn ->
                        TransactionRow(txn, onDelete = { viewModel.deleteTransaction(txn) })
                    }
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
                viewModel.parseAndAddSms(text) { success ->
                    coroutineScope.launch {
                        if (success) {
                            snackbarHostState.showSnackbar("SMS parsed and transaction added successfully!")
                        } else {
                            snackbarHostState.showSnackbar("Could not detect bank transaction. Try manual entry.")
                        }
                    }
                }
                showPasteSmsDialog = false
            }
        )
    }
}

@Composable
fun BalanceSummaryCard(uiState: FinancialUiState) {
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF111827)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = "TOTAL NET BALANCE",
                fontSize = 11.sp,
                fontWeight = FontWeight.SemiBold,
                color = Color(0xFF94A3B8)
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "₹${String.format("%,.2f", uiState.netBalance)}",
                fontSize = 28.sp,
                fontWeight = FontWeight.ExtraBold,
                color = if (uiState.netBalance >= 0) Color.White else Color(0xFFFB7185)
            )

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
                        text = "-₹${String.format("%,.2f", uiState.totalDebits)}",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFFFB7185)
                    )
                }
                Column {
                    Text(text = "Total Credited (+)", fontSize = 11.sp, color = Color(0xFF94A3B8))
                    Text(
                        text = "+₹${String.format("%,.2f", uiState.totalCredits)}",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF34D399)
                    )
                }
                Column {
                    Text(text = "Cash Spent", fontSize = 11.sp, color = Color(0xFF94A3B8))
                    Text(
                        text = "₹${String.format("%,.2f", uiState.totalCashSpent)}",
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
fun TransactionRow(txn: TransactionEntity, onDelete: () -> Unit) {
    val isDebit = txn.type == TransactionType.DEBIT
    val dateStr = SimpleDateFormat("dd MMM, hh:mm a", Locale.getDefault()).format(Date(txn.timestamp))

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
        }
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

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Paste Bank SMS", fontWeight = FontWeight.Bold, fontSize = 16.sp) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    text = "Paste any bank SMS text (HDFC, SBI, ICICI, Axis, UPI, etc.). The app will automatically extract the amount, merchant, and debit/credit type.",
                    fontSize = 12.sp,
                    color = Color(0xFF94A3B8)
                )

                OutlinedTextField(
                    value = smsText,
                    onValueChange = { smsText = it },
                    label = { Text("SMS Content") },
                    placeholder = { Text("e.g. Paid Rs.450.00 to Swiggy on 03-Nov-24 via UPI Ref 4123456789. Avl Bal Rs.25,000") },
                    modifier = Modifier.fillMaxWidth().height(140.dp),
                    maxLines = 6
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (smsText.isNotBlank()) {
                        onParse(smsText.trim())
                    }
                },
                enabled = smsText.isNotBlank()
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

