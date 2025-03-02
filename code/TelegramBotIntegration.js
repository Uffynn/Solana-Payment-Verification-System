// telegram-bot.js - Telegram Bot Integration

const { Telegraf } = require('telegraf');
const axios = require('axios');

// API base URL
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';

// Initialize bot
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// Store payment IDs by user ID
const userPayments = {};

// Start command
bot.start((ctx) => {
  ctx.reply('Welcome to the Sol Payment Bot! Use /subscribe to purchase a subscription.');
});

// Subscribe command
bot.command('subscribe', async (ctx) => {
  const userId = ctx.from.id.toString();
  
  try {
    // Create payment request via API
    const response = await axios.post(`${API_BASE_URL}/payment/create`, {
      userId,
      amountSol: 1,
      metadata: {
        telegramUsername: ctx.from.username,
        chatId: ctx.chat.id
      }
    });
    
    const payment = response.data;
    userPayments[userId] = payment.paymentId;
    
    // Create a message with payment instructions
    ctx.reply(
      `Please send 1 SOL to this address:\n\n` +
      `\`${payment.walletAddress}\`\n\n` +
      `Payment ID: ${payment.paymentId}\n` +
      `This request will expire at: ${payment.expiresAt}\n\n` +
      `Use /status to check if your payment has been confirmed.`,
      { parse_mode: 'Markdown' }
    );
    
    // Setup a periodic check for this payment
    startPaymentCheck(ctx, payment.paymentId, userId);
    
  } catch (error) {
    console.error('Error creating payment request:', error);
    ctx.reply(`Error: ${error.response?.data?.error || error.message}`);
  }
});

// Check status command
bot.command('status', async (ctx) => {
  const userId = ctx.from.id.toString();
  const paymentId = userPayments[userId];
  
  if (!paymentId) {
    return ctx.reply('No pending payment found. Try /subscribe to create a new payment request.');
  }
  
  try {
    const status = await checkPaymentStatus(paymentId);
    if (status.confirmed) {
      ctx.reply(`Your payment has been confirmed! Transaction signature: ${status.transactionSignature}`);
    } else if (status.status === 'expired') {
      ctx.reply('Your payment request has expired. Please use /subscribe to create a new one.');
    } else {
      ctx.reply('Still waiting for your payment. Please check the address and amount.');
    }
  } catch (error) {
    console.error('Error checking payment status:', error);
    ctx.reply(`Error: ${error.response?.data?.error || error.message}`);
  }
});

// Helper function to check payment status
async function checkPaymentStatus(paymentId) {
  const response = await axios.get(`${API_BASE_URL}/payment/status/${paymentId}`);
  return response.data;
}

// Start periodic checking for a payment
function startPaymentCheck(ctx, paymentId, userId) {
  // Check every 1 minute for 30 minutes
  const maxChecks = 30;
  let checkCount = 0;
  
  const checkInterval = setInterval(async () => {
    try {
      checkCount++;
      const status = await checkPaymentStatus(paymentId);
      
      if (status.confirmed) {
        // Payment confirmed
        clearInterval(checkInterval);
        ctx.reply('Payment confirmed! Your subscription is now active. Thank you!');
        
        // Here you would update the user's subscription status in your database
        // updateUserSubscription(userId, 30); // 30 days subscription
        
      } else if (status.status === 'expired' || checkCount >= maxChecks) {
        // Payment expired or timeout reached
        clearInterval(checkInterval);
        if (checkCount >= maxChecks) {
          ctx.reply('Payment check timeout reached. Use /status to manually check if your payment was received.');
        } else {
          ctx.reply('Your payment request has expired. Please use /subscribe to create a new one.');
        }
      }
    } catch (error) {
      console.error('Error in payment check interval:', error);
      // Don't clear the interval on error, just log it
    }
  }, 60 * 1000); // Every minute
}

// Launch bot
bot.launch().then(() => {
  console.log('Bot is running!');
}).catch((err) => {
  console.error('Failed to start bot:', err);
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
