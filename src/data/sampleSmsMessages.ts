export interface SampleSmsItem {
  id: string;
  sender: string;
  bankName: string;
  previewTitle: string;
  body: string;
  type: 'debit' | 'credit';
  expectedAmount: number;
}

export const SAMPLE_SMS_MESSAGES: SampleSmsItem[] = [
  {
    id: 'sample-1',
    sender: 'VM-HDFCBK',
    bankName: 'HDFC Bank',
    previewTitle: 'Amazon India purchase',
    body: 'HDFC Bank: Rs. 1,499.00 debited from A/c **4921 on 02-Nov-26 at AMAZON INDIA. Avl Bal: Rs. 42,150.00. Not you? Call 18002586161.',
    type: 'debit',
    expectedAmount: 1499.0,
  },
  {
    id: 'sample-2',
    sender: 'SBI-INB',
    bankName: 'State Bank of India',
    previewTitle: 'Swiggy Dinner Order',
    body: 'Dear Customer, Your A/c **8812 has been debited by INR 420.00 on 02-Nov-26 20:15 towards SWIGGY UPI:4298102941. Avl Bal: INR 31,580.00.',
    type: 'debit',
    expectedAmount: 420.0,
  },
  {
    id: 'sample-3',
    sender: 'ICICIB',
    bankName: 'ICICI Bank',
    previewTitle: 'Monthly Salary Credit',
    body: 'ICICI Bank Acct XX902 is credited with INR 85,000.00 on 01-Nov-26 by SALARY TECH CORP PVT LTD. Avl Bal: INR 1,16,580.00. Ref: NEFT4910283.',
    type: 'credit',
    expectedAmount: 85000.0,
  },
  {
    id: 'sample-4',
    sender: 'AXISBK',
    bankName: 'Axis Bank',
    previewTitle: 'ATM Cash Withdrawal',
    body: 'Rs. 2,000.00 withdrawn from ATM A/c **1102 on 31-Oct-26 at INDIRANAGAR MAIN ATM. Avl Bal: Rs. 38,580.00.',
    type: 'debit',
    expectedAmount: 2000.0,
  },
  {
    id: 'sample-5',
    sender: 'VK-UPI',
    bankName: 'UPI Inward',
    previewTitle: 'Transfer from Friend',
    body: 'Dear UPI User, Rs 1,500.00 received from RAHUL SHARMA via UPI Ref 4391029418 on 31-Oct-26. Money credited to your linked Bank Account.',
    type: 'credit',
    expectedAmount: 1500.0,
  },
  {
    id: 'sample-6',
    sender: 'HDFCBK',
    bankName: 'HDFC Bank',
    previewTitle: 'Shell Petrol Station Fuel',
    body: 'Alert: You have spent INR 850.00 on your HDFC Debit Card **4921 at SHELL AUTO FUELS on 30-Oct-26. Avl Limit: INR 85,000.00.',
    type: 'debit',
    expectedAmount: 850.0,
  },
  {
    id: 'sample-7',
    sender: 'KOTAKB',
    bankName: 'Kotak Mahindra',
    previewTitle: 'Netflix Subscription',
    body: 'Kotak Bank: Rs 649.00 debited from A/c **7721 on 29-Oct-26 towards NETFLIX COM. Avl Bal Rs 29,480.00. Ref: MANDATE9921',
    type: 'debit',
    expectedAmount: 649.0,
  },
  {
    id: 'sample-8',
    sender: 'HDFCBK',
    bankName: 'HDFC Bank',
    previewTitle: 'Flipkart Refund Credit',
    body: 'Dear Customer, Refund of INR 899.00 has been credited to your HDFC Bank A/c **4921 on 28-Oct-26 by FLIPKART PAYMENTS. Bal: Rs 30,129.00.',
    type: 'credit',
    expectedAmount: 899.0,
  },
  {
    id: 'sample-9',
    sender: 'CHASE',
    bankName: 'Chase Bank',
    previewTitle: 'Trader Joe\'s Grocery ($)',
    body: 'Chase Alert: You made a purchase of $48.25 at TRADER JOE\'S with Debit Card ending 4401 on 10/27/2026.',
    type: 'debit',
    expectedAmount: 48.25,
  },
  {
    id: 'sample-10',
    sender: 'SBI-INB',
    bankName: 'SBI',
    previewTitle: 'Apollo Pharmacy Medicines',
    body: 'SBI: Your A/c **8812 is debited by INR 385.00 on 26-Oct-26 at APOLLO PHARMACY. Avl Bal: INR 29,244.00. UPI Ref: 4810294812.',
    type: 'debit',
    expectedAmount: 385.0,
  },
];
