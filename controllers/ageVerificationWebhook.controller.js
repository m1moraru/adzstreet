import Provider from "../models/providerModel.js";
import { constructWebhookEvent } from "../services/ageVerificationService.js";

export async function stripeIdentityWebhook(req, res) {
  try {
    const signature = req.headers["stripe-signature"];
    const event = constructWebhookEvent(req.body, signature);
    const session = event.data.object;

    let provider = null;

    if (session.client_reference_id) {
      provider = await Provider.findByPublicId(session.client_reference_id);
    }

    if (!provider && session.id) {
      provider = await Provider.findByVerificationSessionId(session.id);
    }

    if (!provider) {
      return res.json({ received: true, skipped: true });
    }

    if (event.type === "identity.verification_session.verified") {
      await Provider.markAgeVerificationApproved(provider.id);
    }

    if (event.type === "identity.verification_session.requires_input") {
      await Provider.markAgeVerificationNeedsReview(
        provider.id,
        "Verification requires more input or retry"
      );
    }

    if (event.type === "identity.verification_session.canceled") {
      await Provider.markAgeVerificationDeclined(
        provider.id,
        "Verification session canceled"
      );
    }

    return res.json({ received: true });
  } catch (error) {
    console.error("stripeIdentityWebhook error:", error);
    return res.status(400).json({ message: error.message });
  }
}