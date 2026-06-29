import type { HttpTypes } from "@medusajs/types";
import { Elements } from "@stripe/react-stripe-js";
import type { Stripe, StripeElementsOptions } from "@stripe/stripe-js";
import type React from "react";

interface StripeWrapperProps {
  children: React.ReactNode;
  paymentSession: HttpTypes.StorePaymentSession;
  stripeKey?: string;
  stripePromise: Promise<Stripe | null> | null;
}

export const StripeWrapper: React.FC<StripeWrapperProps> = ({
  children,
  paymentSession,
  stripeKey,
  stripePromise,
}) => {
  const options: StripeElementsOptions = {
    clientSecret: paymentSession.data?.client_secret as string | undefined,
  };

  if (!stripeKey) {
    throw new Error(
      "Stripe key is missing. Set NEXT_PUBLIC_STRIPE_KEY environment variable."
    );
  }

  if (!stripePromise) {
    throw new Error(
      "Stripe promise is missing. Make sure you have provided a valid Stripe key."
    );
  }

  if (!paymentSession?.data?.client_secret) {
    throw new Error(
      "Stripe client secret is missing. Cannot initialize Stripe."
    );
  }

  return (
    <Elements options={options} stripe={stripePromise}>
      {/* Cast bridges a benign ReactNode skew: @stripe/react-stripe-js resolves a
          React ReactNode without `bigint`, vs the app's React 19 ReactNode. */}
      {children as React.ComponentProps<typeof Elements>["children"]}
    </Elements>
  );
};
