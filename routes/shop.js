const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

router.post('/crear-sesion', async (req, res) => {
  const { items } = req.body;

  try {
    const line_items = items.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: { name: item.nombre + ' — ' + item.plataforma },
        unit_amount: Math.round(item.precio * 100),
      },
      quantity: item.cantidad,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      success_url: 'http://localhost:3000/success.html',
      cancel_url: 'http://localhost:3000/',
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear sesión de pago' });
  }
});

module.exports = router;