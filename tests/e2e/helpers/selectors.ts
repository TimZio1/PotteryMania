/** Stable locators / copy shared across smoke tests. */
export const COPY = {
  earlyAccessHero: /Something new is coming to ceramics/i,
  earlyAccessRegisterHeading: /Register your studio/i,
  marketplaceHeading: /Marketplace/i,
} as const;

export const earlyAccessIds = {
  email: "#ea-email",
  studio: "#ea-studio",
  country: "#ea-country",
  web: "#ea-web",
} as const;

export const loginIds = {
  email: "#login-email",
  password: "#login-password",
} as const;

export const registerIds = {
  email: "#reg-email",
  password: "#reg-password",
} as const;
