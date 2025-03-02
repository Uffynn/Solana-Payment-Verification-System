**Solana Payment Verification System**

A lightweight system for accepting and verifying Solana payments for subscriptions, digital products, or services. This system utilizes both direct blockchain queries and Solscan API for efficient transaction verification.
Features

✅ Simple payment flow: generate a payment address → user pays → system verifies
<br>
✅ Multiple verification methods (Solscan API + direct Solana RPC)
<br>
✅ Express API server for scalable request handling
<br>
✅ Single treasury wallet design (no need to create new wallets)
<br>
✅ Automatic payment expiration and cleanup
<br>
✅ Ready-to-use Telegram bot integration
<br>
✅ Comprehensive error handling

--------------------------------------------------------------------------------------------------------------

**System Architecture**

This payment system consists of three main components:

**1. Core Verification Logic (solana-verify.js):** Handles the verification of Solana payments by checking the blockchain.
<br>
**2. Express API Server (server.js):** Provides RESTful endpoints for creating and checking payment status.
<br>
**3. Telegram Bot Integration (telegram-bot.js):** Example integration with Telegram for subscription payments.
<br>

--------------------------------------------------------------------------------------------------------------

**Installation**

**Prerequisites**

Node.js 14+ installed
npm or yarn
A Solana wallet address to receive payments

**Setup**

1. Clone the repository:

```
git clone https://github.com/yourusername/solana-payment-system.git
cd solana-payment-system
```

2. Install dependencies:

```
npm install
```

3. Create a .env file with your configuration:

```
TREASURY_WALLET=YOUR_SOLANA_WALLET_ADDRESS
SOLANA_NETWORK=mainnet-beta
PORT=3000
TELEGRAM_BOT_TOKEN=YOUR_TELEGRAM_BOT_TOKEN
API_BASE_URL=http://localhost:3000/api
```

4. Start the API server:

```
node server.js
```

5. (Optional) Start the Telegram bot in a separate terminal:

```
node telegram-bot.js
```

--------------------------------------------------------------------------------------------------------------

**How It Works**

**Verification Process**
This system implements two methods for transaction verification:

**1. Solscan API Verification**
The primary verification method uses Solscan's public API to check for transactions:

- Faster and more efficient than direct RPC calls
- Reduced load on Solana nodes
- More detailed transaction information
- Handles both SOL and SPL token transfers

**2. Direct RPC Verification (Fallback)**
If Solscan is unavailable or returns an error, the system falls back to direct Solana RPC verification:

- Connects directly to Solana nodes
- Gets transaction signatures for the treasury wallet
- Analyzes pre/post balances to detect transfers
- Works even if third-party services are down

**Payment Flow**

1. Create Payment Request:

Client calls the API to create a payment request
System generates a unique payment ID and stores payment details
Returns the treasury wallet address for the user to send funds to

2. User Payment:

User sends the specified amount of SOL to the treasury wallet

3. Verification:

Client periodically checks payment status via API
Server verifies the transaction on the blockchain
Confirms payment when a matching transaction is found

4. Confirmation:

System marks the payment as confirmed
Client can activate the purchased service/subscription

--------------------------------------------------------------------------------------------------------------

**API Reference**
**Express API Endpoints**

**Create Payment Request**
```
POST /api/payment/create
```

Request Body:
```
{
  "userId": "user123",
  "amountSol": 1,
  "metadata": { "optional": "data" }
}
```

Response:
```
{
  "paymentId": "payment_user123_1614567890123_a1b2c3d4",
  "userId": "user123",
  "walletAddress": "YOUR_TREASURY_WALLET_ADDRESS",
  "amountSol": 1,
  "expiresAt": "2023-01-01T12:30:00.000Z"
}
```

**Check Payment Status**
```
GET /api/payment/status/:paymentId
```

Response:
```
{
  "paymentId": "payment_user123_1614567890123_a1b2c3d4",
  "userId": "user123",
  "confirmed": true,
  "status": "confirmed",
  "createdAt": "2023-01-01T12:00:00.000Z",
  "confirmedAt": "2023-01-01T12:05:23.000Z",
  "transactionSignature": "5KKsaj..."
}
```

**Get User Pending Payments**
```
GET /api/payment/pending/:userId
```

Response:
```
[
  {
    "paymentId": "payment_user123_1614567890123_a1b2c3d4",
    "userId": "user123",
    "amountSol": 1,
    "createdAt": "2023-01-01T12:00:00.000Z",
    "expiresAt": "2023-01-01T12:30:00.000Z"
  }
]
```

**Customization Guide**
**Adapting to Your Needs**

**1. Database Integration:**

Replace the in-memory storage (pendingPayments) with a database
Add database connection code in solana-verify.js
Modify methods to read/write from database


**2. Custom Payment Logic:**

Extend SolanaVerifier class with your own verification rules
Add additional metadata to payment records
Implement subscription tracking logic


**3. Frontend Integration:**

Create a frontend application that calls the API endpoints
Display payment address and QR code to users
Show payment status and confirmation

--------------------------------------------------------------------------------------------------------------

**Code Structure**

```
solana-payment-system/
├── solana-verify.js        # Core verification logic
├── server.js               # Express API server
├── telegram-bot.js         # Telegram bot integration
├── package.json            # Dependencies
├── .env                    # Configuration
└── README.md               # Documentation
```

--------------------------------------------------------------------------------------------------------------

**Troubleshooting**
**Common Issues**

1. Payment Not Detected

Ensure the transaction has been confirmed on Solana blockchain
Verify the exact amount matches what was requested
Check if the transaction was sent to the correct wallet address
Solana transactions may take time to confirm, especially during network congestion


2. API Connection Issues

Check if your Express server is running
Verify the API base URL is correctly configured
Ensure there are no firewall issues blocking connections


3. Solscan API Limitations

Public API may have rate limits
Consider using a Solscan API key for production use
The system will automatically fall back to direct RPC if Solscan fails

--------------------------------------------------------------------------------------------------------------

**Advanced Configuration**
For production use, consider the following enhancements:

1. Load Balancing:

Deploy multiple instances of the Express API server
Use PM2 or Docker for process management
Implement a load balancer for high-traffic applications


2. Security Enhancements:

Add API authentication
Implement rate limiting
Use HTTPS for all API endpoints
Validate input data more strictly


3. Monitoring:

Add logging with Winston or similar
Set up alerts for failed payments
Monitor system performance metrics
