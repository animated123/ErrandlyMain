const express = require('express');
const crypto = require('crypto');
const app = express();

// Use express.json() to parse incoming POST requests
app.use(express.json());

// Environment Variables
const PORT = process.env.PORT || 3000;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

/**
 * Signature Verification Helper
 * This is a common pattern for Kenyan payment providers like PayHero.
 * It verifies that the request came from the provider using a shared secret.
 */
function verifySignature(req) {
  if (!WEBHOOK_SECRET) {
    console.warn('WEBHOOK_SECRET not set. Skipping signature verification (INSECURE).');
    return true;
  }

  const signature = req.headers['x-signature'] || req.headers['authorization'];
  if (!signature) return false;

  const payload = JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  return signature === expectedSignature;
}

// Specific route /webhook to receive data
app.post('/webhook', (req, res) => {
  console.log('--- New Webhook Received ---');
  
  // Implement Signature Verification (security)
  if (!verifySignature(req)) {
    console.error('Invalid signature. Request rejected.');
    return res.status(401).send('Invalid signature');
  }

  const paymentData = req.body;
  
  // Log the payment status (Success/Failed) to the console
  // Note: Field names vary by provider (e.g., status, ResultCode, TransactionStatus)
  const status = paymentData.status || paymentData.ResultCode || 'Unknown';
  const transactionId = paymentData.transaction_id || paymentData.MerchantRequestID || 'N/A';
  const amount = paymentData.amount || paymentData.Amount || '0';

  if (status === 'Success' || status === '0' || status === 0) {
    console.log(`✅ Payment SUCCESS: Transaction ID ${transactionId}, Amount: ${amount}`);
  } else {
    console.log(`❌ Payment FAILED: Transaction ID ${transactionId}, Status: ${status}`);
  }

  // Return a 200 OK response to the payment provider to acknowledge receipt
  res.status(200).json({
    status: 'success',
    message: 'Webhook received and acknowledged'
  });
});

// Health check route
app.get('/', (req, res) => {
  res.send('Payment Callback Service is running.');
});

// Use process.env.PORT for Railway's infrastructure
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
