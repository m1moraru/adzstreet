export function calculatePlanExpiry(duration) {
  const expiry = new Date();

  switch (duration) {
    case "7d":
      expiry.setDate(expiry.getDate() + 7);
      break;

    case "14d":
      expiry.setDate(expiry.getDate() + 14);
      break;

    case "1m":
      expiry.setMonth(expiry.getMonth() + 1);
      break;

    case "12m":
      expiry.setMonth(expiry.getMonth() + 12);
      break;

    default:
      expiry.setMonth(expiry.getMonth() + 12);
  }

  return expiry;
}