// solana-verify.js - Core verification logic

const { Connection, PublicKey, LAMPORTS_PER_SOL, clusterApiUrl } = require('@solana/web3.js');
const crypto = require('crypto');
const axios = require('axios');

class SolanaVerifier {
  constructor(config = {}) {
    // Default to devnet, but can use mainnet-beta for production
    this.network = config.network || 'devnet';
    this.connection = new Connection(clusterApiUrl(this.network), 'confirmed');
    
    // Main treasury wallet to receive all payments
    this.treasuryWallet = config.treasuryWallet;
    
    // Verify this is a valid Solana address
    if (!this.treasuryWallet) {
      throw new Error('Treasury wallet public key is required');
    }
    
    try {
      this.treasuryPublicKey = new PublicKey(this.treasuryWallet);
    } catch (error) {
      throw new Error('Invalid treasury wallet public key');
    }
    
    // In-memory storage (can be replaced with database in production)
    this.pendingPayments = {};
  }
  
  /**
   * Generate a unique payment address for a user
   * @param {string} userId - Unique identifier for the user
   * @param {number} amountSol - Amount in SOL to be paid
   * @param {Object} metadata - Additional metadata to store with the payment
   * @returns {Object} Payment details including address
   */
  createPaymentRequest(userId, amountSol, metadata = {}) {
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    if (!amountSol || amountSol <= 0) {
      throw new Error('Amount must be greater than 0');
    }
    
    // Generate a unique payment ID
    const paymentId = `payment_${userId}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    
    // Store payment details
    this.pendingPayments[paymentId] = {
      userId,
      amountLamports: amountSol * LAMPORTS_PER_SOL,
      status: 'pending',
      createdAt: Date.now(),
      expiresAt: Date.now() + (30 * 60 * 1000), // 30 minutes
      metadata
    };
    
    return {
      paymentId,
      userId,
      walletAddress: this.treasuryWallet,
      amountSol,
      expiresAt: new Date(this.pendingPayments[paymentId].expiresAt).toISOString()
    };
  }
  
  /**
   * Check if a payment has been received using direct Solana RPC
   * @param {string} paymentId - The payment ID to check
   * @returns {Promise<boolean>} True if payment is confirmed, false otherwise
   */
  async checkPaymentStatusViaRPC(paymentId) {
    const payment = this.pendingPayments[paymentId];
    
    if (!payment) {
      throw new Error('Payment not found');
    }
    
    // Check if payment is already confirmed
    if (payment.status === 'confirmed') {
      return true;
    }
    
    // Check if payment is expired
    if (Date.now() > payment.expiresAt) {
      payment.status = 'expired';
      return false;
    }
    
    try {
      // Get the most recent transactions to the treasury wallet
      const signatures = await this.connection.getSignaturesForAddress(
        this.treasuryPublicKey,
        { limit: 10 }
      );
      
      // Only look at transactions after the payment was created
      const relevantSignatures = signatures.filter(
        sig => new Date(sig.blockTime * 1000) >= new Date(payment.createdAt)
      );
      
      // Check each transaction to see if it matches our expected payment
      for (const sig of relevantSignatures) {
        const tx = await this.connection.getTransaction(sig.signature);
        
        if (!tx || !tx.meta || tx.meta.err) {
          continue; // Skip failed transactions
        }
        
        // Look for a transfer to our treasury wallet with the right amount
        const preBalances = tx.meta.preBalances;
        const postBalances = tx.meta.postBalances;
        const accountKeys = tx.transaction.message.accountKeys;
        
        for (let i = 0; i < accountKeys.length; i++) {
          const key = accountKeys[i].toString();
          if (key === this.treasuryWallet) {
            const balanceChange = postBalances[i] - preBalances[i];
            
            // Allow for a small variance to account for transaction fees
            if (Math.abs(balanceChange - payment.amountLamports) < 1000) {
              // Payment confirmed!
              payment.status = 'confirmed';
              payment.confirmedAt = Date.now();
              payment.transactionSignature = sig.signature;
              return true;
            }
          }
        }
      }
      
      // Payment not yet received
      return false;
    } catch (error) {
      console.error('Error checking payment status via RPC:', error);
      return false;
    }
  }
  
  /**
   * Check if a payment has been received using Solscan API
   * @param {string} paymentId - The payment ID to check
   * @returns {Promise<boolean>} True if payment is confirmed, false otherwise
   */
  async checkPaymentStatusViaSolscan(paymentId) {
    const payment = this.pendingPayments[paymentId];
    
    if (!payment) {
      throw new Error('Payment not found');
    }
    
    // Check if payment is already confirmed
    if (payment.status === 'confirmed') {
      return true;
    }
    
    // Check if payment is expired
    if (Date.now() > payment.expiresAt) {
      payment.status = 'expired';
      return false;
    }
    
    try {
      // Use Solscan API to get recent transactions
      // Note: You might need an API key for production use
      const solscanUrl = `https://public-api.solscan.io/account/transactions`;
      const response = await axios.get(solscanUrl, {
        params: {
          account: this.treasuryWallet,
          limit: 10
        },
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.data || !Array.isArray(response.data)) {
        throw new Error('Invalid response from Solscan API');
      }
      
      // Get the creation timestamp (in seconds)
      const creationTimestamp = Math.floor(payment.createdAt / 1000);
      
      // Filter transactions that occurred after the payment was created
      for (const tx of response.data) {
        // Skip if transaction is too old
        if (tx.blockTime < creationTimestamp) {
          continue;
        }
        
        // Look for transactions with the right amount
        // Note: Solscan formats might change, adjust as needed
        if (tx.status === 'Success' && tx.tokenTransfers) {
          for (const transfer of tx.tokenTransfers) {
            if (transfer.destination === this.treasuryWallet) {
              const amountReceived = parseFloat(transfer.amount);
              
              // Allow for small variance
              if (Math.abs(amountReceived * LAMPORTS_PER_SOL - payment.amountLamports) < 1000) {
                // Payment confirmed!
                payment.status = 'confirmed';
                payment.confirmedAt = Date.now();
                payment.transactionSignature = tx.txHash;
                return true;
              }
            }
          }
        }
      }
      
      // Check for SOL transfers (non-token)
      for (const tx of response.data) {
        if (tx.blockTime < creationTimestamp) {
          continue;
        }
        
        // For SOL transfers we need to get detailed transaction info
        const txDetailUrl = `https://public-api.solscan.io/transaction/${tx.txHash}`;
        const txDetail = await axios.get(txDetailUrl, {
          headers: {
            'Accept': 'application/json'
          }
        });
        
        if (txDetail.data && txDetail.data.status === 'Success') {
          // Look for balance changes in our wallet
          const expectedAmount = payment.amountLamports / LAMPORTS_PER_SOL;
          
          // This is a simplified check - in production, analyze the tx details more carefully
          if (txDetail.data.signer && txDetail.data.signer.includes(this.treasuryWallet)) {
            continue; // Skip outgoing transactions
          }
          
          // Check if any of the instructions involve a transfer to our wallet
          if (txDetail.data.parsedInstruction) {
            for (const instruction of txDetail.data.parsedInstruction) {
              if (
                instruction.type === 'transfer' && 
                instruction.params && 
                instruction.params.destination === this.treasuryWallet
              ) {
                const amountReceived = parseFloat(instruction.params.amount);
                
                // Check if amount matches (with small variance)
                if (Math.abs(amountReceived - expectedAmount) < 0.0001) {
                  // Payment confirmed!
                  payment.status = 'confirmed';
                  payment.confirmedAt = Date.now();
                  payment.transactionSignature = tx.txHash;
                  return true;
                }
              }
            }
          }
        }
      }
      
      // Payment not yet received
      return false;
    } catch (error) {
      console.error('Error checking payment status via Solscan:', error);
      // Fall back to RPC method if Solscan fails
      return this.checkPaymentStatusViaRPC(paymentId);
    }
  }
  
  /**
   * Check payment status using the best available method
   * @param {string} paymentId - The payment ID to check
   * @returns {Promise<boolean>} True if payment is confirmed, false otherwise
   */
  async checkPaymentStatus(paymentId) {
    try {
      // Try Solscan first (faster and more efficient)
      return await this.checkPaymentStatusViaSolscan(paymentId);
    } catch (error) {
      console.log('Solscan check failed, falling back to RPC:', error.message);
      // Fall back to direct RPC if Solscan fails
      return await this.checkPaymentStatusViaRPC(paymentId);
    }
  }
  
  /**
   * Get all pending payments for a user
   * @param {string} userId - The user ID to check
   * @returns {Array} List of pending payments
   */
  getUserPendingPayments(userId) {
    return Object.values(this.pendingPayments)
      .filter(payment => payment.userId === userId && payment.status === 'pending')
      .map(payment => ({
        paymentId: Object.keys(this.pendingPayments).find(key => this.pendingPayments[key] === payment),
        userId: payment.userId,
        amountSol: payment.amountLamports / LAMPORTS_PER_SOL,
        createdAt: new Date(payment.createdAt).toISOString(),
        expiresAt: new Date(payment.expiresAt).toISOString()
      }));
  }
  
  /**
   * Clean up old/expired payments to prevent memory leaks
   */
  cleanupExpiredPayments() {
    const now = Date.now();
    Object.keys(this.pendingPayments).forEach(paymentId => {
      const payment = this.pendingPayments[paymentId];
      // Remove payments that are expired or confirmed and older than 1 day
      if ((payment.status === 'expired' || payment.status === 'confirmed') && 
          now - payment.createdAt > 24 * 60 * 60 * 1000) {
        delete this.pendingPayments[paymentId];
      }
    });
  }
}

module.exports = SolanaVerifier;
