let riskScore = 0;

export const updateRisk = (status) => {
  switch (status) {
    case "No Face ❌":
      riskScore += 2;
      break;

    case "Multiple Faces ⚠️":
      riskScore += 5;
      break;

    case "Looking Left 👀":
    case "Looking Right 👀":
      riskScore += 1;
      break;

    case "Talking 🗣️":
      riskScore += 2;
      break;

    default:
      riskScore -= 0.5; // reduce risk if normal
  }

  // clamp value
  if (riskScore < 0) riskScore = 0;
  if (riskScore > 100) riskScore = 100;

  return Math.round(riskScore);
};