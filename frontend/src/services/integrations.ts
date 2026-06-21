// Simulated integration helpers for frontend development.
// These functions only simulate behavior and should be replaced
// with real OAuth flows / provider SDKs when backend is ready.

export const simulateGoogleAuth = () => {
  return new Promise<void>((resolve) => {
    console.log('Simulating Google OAuth flow...');
    setTimeout(() => resolve(), 800);
  });
};

export const simulateSmsSend = (to: string, message: string) => {
  return new Promise<void>((resolve) => {
    console.log(`Simulating SMS send to ${to}: ${message}`);
    setTimeout(() => resolve(), 500);
  });
};

export const simulateStripeConnect = () => {
  return new Promise<void>((resolve) => {
    console.log('Simulating Stripe connect...');
    setTimeout(() => resolve(), 700);
  });
};

export const simulateZoomConnect = () => {
  return new Promise<void>((resolve) => {
    console.log('Simulating Zoom OAuth...');
    setTimeout(() => resolve(), 700);
  });
};

export default {
  simulateGoogleAuth,
  simulateSmsSend,
  simulateStripeConnect,
  simulateZoomConnect,
};
