import { Client, Environment } from "square";

const resolveSquareEnvironment = () => {
  const raw = (process.env.SQUARE_ENVIRONMENT || "sandbox").toLowerCase();
  return raw === "production" ? Environment.Production : Environment.Sandbox;
};

export const getSquareEnvironmentName = () => {
  return resolveSquareEnvironment() === Environment.Production ? "production" : "sandbox";
};

export const getSquareOAuthBaseUrl = () => {
  return resolveSquareEnvironment() === Environment.Production
    ? "https://connect.squareup.com"
    : "https://connect.squareupsandbox.com";
};

export const createSquareClient = (accessToken?: string) => {
  return new Client({
    accessToken: accessToken ?? process.env.SQUARE_ACCESS_TOKEN ?? "",
    environment: resolveSquareEnvironment(),
  });
};
