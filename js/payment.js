// Reusable Stripe Checkout initiator
// Usage:
// initiatePayment({ bookingId, bookingType: 'safari'|'hotel'|'service'|'custom', title, amount, currency: 'USD', deposit: false, customer: { name, email }, metadata: { ... } })

async function initiatePayment(opts) {
  const {
    bookingId,
    bookingType = 'safari',
    title = 'Gisu Safaris Booking',
    amount,
    currency = undefined,
    deposit = false,
    customer = {},
    metadata = {},
    endpoint = '/backend/api/payments/create_checkout.php',
  } = opts || {};

  if (!bookingId || !amount || !(customer && customer.email)) {
    alert('Missing bookingId, amount, or customer.email');
    return;
  }

  try {
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId, bookingType, title, amount, currency, deposit, customer, metadata }),
    });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error('Failed to create checkout: ' + text);
    }
    const data = await resp.json();
    if (!data || !data.url) {
      throw new Error('No checkout url returned');
    }
    window.location.href = data.url;
  } catch (err) {
    console.error('initiatePayment error', err);
    alert('Unable to start payment. Please try again or contact support.');
  }
}

// Helper: bind a button by selector
function bindPaymentButton(selector, getOptions) {
  const el = document.querySelector(selector);
  if (!el) return;
  el.addEventListener('click', async (e) => {
    e.preventDefault();
    const opts = typeof getOptions === 'function' ? getOptions(el) : getOptions;
    await initiatePayment(opts);
  });
}
