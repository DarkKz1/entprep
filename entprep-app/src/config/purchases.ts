// RevenueCat IAP wrapper — all functions are no-ops on web
import { Capacitor } from '@capacitor/core';

const RC_API_KEY_APPLE = import.meta.env.VITE_RC_API_KEY_APPLE || '';
const RC_API_KEY_GOOGLE = import.meta.env.VITE_RC_API_KEY_GOOGLE || '';

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

let rcModule: typeof import('@revenuecat/purchases-capacitor') | null = null;

async function getRCModule() {
  if (!rcModule) {
    rcModule = await import('@revenuecat/purchases-capacitor');
  }
  return rcModule;
}

export async function initPurchases(userId?: string): Promise<void> {
  if (!isNativePlatform()) return;
  const { Purchases } = await getRCModule();
  const platform = Capacitor.getPlatform();
  const apiKey = platform === 'ios' ? RC_API_KEY_APPLE : RC_API_KEY_GOOGLE;
  if (!apiKey) return;
  await Purchases.configure({ apiKey, appUserID: userId || undefined });
}

export async function loginPurchases(userId: string, email?: string): Promise<void> {
  if (!isNativePlatform()) return;
  const { Purchases } = await getRCModule();
  await Purchases.logIn({ appUserID: userId });
  if (email) {
    await Purchases.setAttributes({ $email: email });
  }
}

export async function logoutPurchases(): Promise<void> {
  if (!isNativePlatform()) return;
  const { Purchases } = await getRCModule();
  await Purchases.logOut();
}

export interface RCOffering {
  identifier: string;
  availablePackages: RCPackage[];
}

export interface RCPackage {
  identifier: string;
  product: {
    identifier: string;
    priceString: string;
    price: number;
  };
}

export async function getOfferings(): Promise<RCOffering | null> {
  if (!isNativePlatform()) return null;
  const { Purchases } = await getRCModule();
  const offerings = await Purchases.getOfferings();
  return (offerings.current as RCOffering | undefined) ?? null;
}

export async function purchasePackage(pkg: RCPackage): Promise<boolean> {
  if (!isNativePlatform()) return false;
  const { Purchases } = await getRCModule();
  const result = await Purchases.purchasePackage({ aPackage: pkg as never });
  const entitlement = result.customerInfo?.entitlements?.active?.['premium'];
  return !!entitlement;
}

export async function checkPremiumStatus(): Promise<boolean> {
  if (!isNativePlatform()) return false;
  const { Purchases } = await getRCModule();
  const { customerInfo } = await Purchases.getCustomerInfo();
  return !!customerInfo?.entitlements?.active?.['premium'];
}

export async function restorePurchases(): Promise<boolean> {
  if (!isNativePlatform()) return false;
  const { Purchases } = await getRCModule();
  const { customerInfo } = await Purchases.restorePurchases();
  return !!customerInfo?.entitlements?.active?.['premium'];
}
