import { SquareClient, SquareEnvironment } from "square";

const resolveSquareEnvironment = () => {
  const raw = (process.env.SQUARE_ENVIRONMENT || "sandbox").toLowerCase();
  return raw === "production" ? SquareEnvironment.Production : SquareEnvironment.Sandbox;
};

export const getSquareEnvironmentName = () => {
  return resolveSquareEnvironment() === SquareEnvironment.Production ? "production" : "sandbox";
};

export const getSquareOAuthBaseUrl = () => {
  return resolveSquareEnvironment() === SquareEnvironment.Production
    ? "https://connect.squareup.com"
    : "https://connect.squareupsandbox.com";
};

export const createSquareClient = (accessToken?: string) => {
  return new SquareClient({
    token: accessToken ?? process.env.SQUARE_ACCESS_TOKEN ?? "",
    environment: resolveSquareEnvironment(),
  });
};
