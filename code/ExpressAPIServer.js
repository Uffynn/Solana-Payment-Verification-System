// server.js - Express API Server

const express = require('express');
const SolanaVerifier = require('./solana-verify');
const cors = require('cors');

// Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// Initialize Solana verifier
const solanaVerifier = new SolanaVerifier({
  treasuryWallet: process.env.TREASURY_WALLET || 'YOUR_TREASURY_WALLET_ADDRESS',
  network: process.env.SOLANA_NETWORK || 'mainnet-beta'
});

// Setup scheduling for cleanup
setInterval(() => {
  solanaVerifier.cleanupExpiredPayments();
  console.log('Cleaned up expired payments');
}, 1000 * 60 * 60); // Every hour

// API Routes

// Create a new payment request
app.post('/api/payment/create', async (req, res) => {
  try {
    const { userId, amountSol, metadata } = req.body;
    
    if (!userId || !amountSol) {
      return res.status(400).json({ error: 'userId and amountSol are required' });
    }
    
    const paymentRequest = solanaVerifier.createPaymentRequest(
      userId, 
      parseFloat(amountSol), 
      metadata || {}
    );
    
    res.json(paymentRequest);
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(400).json({ error: error.message });
  }
});

// Check payment status
app.get('/api/payment/status/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    if (!paymentId) {
      return res.status(400).json({ error: 'Payment ID is required' });
    }
    
    const isConfirmed = await solanaVerifier.checkPaymentStatus(paymentId);
    
    const payment = solanaVerifier.pendingPayments[paymentId];
    
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    
    res.json({
      paymentId,
      userId: payment.userId,
      confirmed: isConfirmed,
      status: payment.status,
      createdAt: new Date(payment.createdAt).toISOString(),
      ...(payment.confirmedAt && { confirmedAt: new Date(payment.confirmedAt).toISOString() }),
      ...(payment.transactionSignature && { transactionSignature: payment.transactionSignature })
    });
  } catch (error) {
    console.error('Error checking payment status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user pending payments
app.get('/api/payment/pending/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const pendingPayments = solanaVerifier.getUserPendingPayments(userId);
    res.json(pendingPayments);
  } catch (error) {
    console.error('Error getting pending payments:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
