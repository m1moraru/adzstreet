import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function createVerificationSession(provider) {
  return stripe.identity.verificationSessions.create({
    type: "document",
    client_reference_id: provider.public_id,
    metadata: {
      provider_id: String(provider.id),
      provider_public_id: provider.public_id,
      provider_email: provider.email || "",
    },
    options: {
      document: {
        require_matching_selfie: true,
        require_id_number: false,
      },
    },
    return_url: `${process.env.FRONTEND_URL}/verification-return?session_id={VERIFICATION_SESSION_ID}`,
  });
}

export function constructWebhookEvent(rawBody, signature) {
  return stripe.webhooks.constructEvent(
    rawBody,
    signature,
    process.env.STRIPE_IDENTITY_WEBHOOK_SECRET
  );
}