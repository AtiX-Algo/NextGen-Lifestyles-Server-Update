const Stripe = require('stripe');
const dotenv = require('dotenv');
dotenv.config();

// Initialize Stripe with Secret Key from .env
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// @desc    Create Payment Intent
// @route   POST /api/payment/create-intent
const createPaymentIntent = async (req, res) => {
  try {
    const { amount } = req.body; 

    // Stripe expects amount in Cents (e.g., $10.00 = 1000 cents)
    const amountInCents = Math.round(amount * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd', 
      payment_method_types: ['card'], 
    });

    res.send({
      clientSecret: paymentIntent.client_secret,
    });

  } catch (error) {
    console.error("Stripe Error:", error);
    res.status(500).json({ message: 'Payment Error' });
  }
};

module.exports = { createPaymentIntent };