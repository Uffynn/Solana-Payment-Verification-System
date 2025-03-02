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
