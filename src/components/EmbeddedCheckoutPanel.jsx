import { EmbeddedCheckout, EmbeddedCheckoutProvider } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { createPortal } from 'react-dom';

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

export default function EmbeddedCheckoutPanel({ clientSecret, itemName, error, onClose }) {
  const checkout = (
    <div
      className="stripe-checkout-shell"
      role="dialog"
      aria-modal="true"
      aria-label="Checkout"
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      onPointerMove={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
      onPointerCancel={(event) => event.stopPropagation()}
    >
      <div className="stripe-checkout-panel">
        <button className="stripe-checkout-close" type="button" aria-label="Close checkout" onClick={onClose}>
          ×
        </button>
        <h2>{itemName || 'Checkout'}</h2>
        {error && <p className="stripe-checkout-error">{error}</p>}
        {!publishableKey && (
          <p className="stripe-checkout-error">
            Stripe publishable key is not configured.
          </p>
        )}
        {publishableKey && clientSecret && (
          <EmbeddedCheckoutProvider
            stripe={stripePromise}
            options={{ clientSecret }}
          >
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        )}
      </div>
    </div>
  );

  return createPortal(checkout, document.body);
}
