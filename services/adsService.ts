import { Capacitor } from '@capacitor/core';
import {
  AdMob,
  AdmobConsentStatus,
  BannerAdPosition,
  BannerAdSize,
  MaxAdContentRating,
} from '@capacitor-community/admob';

/**
 * Google's official sample ad units — safe for development.
 * Replace with your own AdMob IDs in .env.local before shipping:
 *   ADMOB_BANNER_ID=ca-app-pub-xxxxxxxxxxxxxxxx/xxxxxxxxxx
 *   ADMOB_REWARDED_ID=ca-app-pub-xxxxxxxxxxxxxxxx/xxxxxxxxxx
 *   ADMOB_USE_TEST_ADS=false
 *
 * Create an AdMob account: https://apps.admob.google.com/
 */
export const TEST_AD_UNITS = {
  appId: 'ca-app-pub-3940256099942544~3347511713',
  banner: 'ca-app-pub-3940256099942544/6300978111',
  rewarded: 'ca-app-pub-3940256099942544/5224354917',
};

const useTestAds = process.env.ADMOB_USE_TEST_ADS !== 'false';

export const AD_UNITS = {
  banner: useTestAds
    ? TEST_AD_UNITS.banner
    : (process.env.ADMOB_BANNER_ID || TEST_AD_UNITS.banner),
  rewarded: useTestAds
    ? TEST_AD_UNITS.rewarded
    : (process.env.ADMOB_REWARDED_ID || TEST_AD_UNITS.rewarded),
};

let initialized = false;
let bannerVisible = false;

export const isNativeAdsAvailable = (): boolean => Capacitor.isNativePlatform();

export const initializeAds = async (): Promise<void> => {
  if (initialized || !isNativeAdsAvailable()) return;
  try {
    await AdMob.initialize({
      initializeForTesting: useTestAds,
      maxAdContentRating: MaxAdContentRating.ParentalGuidance,
    });

    try {
      const consentInfo = await AdMob.requestConsentInfo();
      if (
        consentInfo.isConsentFormAvailable &&
        consentInfo.status === AdmobConsentStatus.REQUIRED
      ) {
        await AdMob.showConsentForm();
      }
    } catch (consentError) {
      console.warn('AdMob consent flow skipped', consentError);
    }

    initialized = true;
  } catch (error) {
    console.warn('AdMob initialize failed', error);
  }
};

/**
 * Shows a rewarded video. Resolves:
 *  - 'rewarded' when the user finished the ad (native AdMob)
 *  - 'web' when we should use the in-app web fallback overlay
 *  - 'dismissed' when the user closed the ad without earning a reward
 */
export const showRewardedAd = async (): Promise<'rewarded' | 'web' | 'dismissed'> => {
  if (!isNativeAdsAvailable()) return 'web';
  await initializeAds();
  try {
    await AdMob.prepareRewardVideoAd({
      adId: AD_UNITS.rewarded,
      isTesting: useTestAds,
    });
    await AdMob.showRewardVideoAd();
    return 'rewarded';
  } catch (error) {
    console.warn('Rewarded ad unavailable, falling back to web overlay', error);
    return 'web';
  }
};

export const showBannerAd = async (): Promise<boolean> => {
  if (!isNativeAdsAvailable()) return false;
  if (bannerVisible) return true;
  await initializeAds();
  try {
    await AdMob.showBanner({
      adId: AD_UNITS.banner,
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      margin: 0,
      isTesting: useTestAds,
    });
    bannerVisible = true;
    return true;
  } catch (error) {
    console.warn('Banner ad failed', error);
    return false;
  }
};

export const hideBannerAd = async (): Promise<void> => {
  if (!isNativeAdsAvailable() || !bannerVisible) return;
  try {
    await AdMob.hideBanner();
    await AdMob.removeBanner();
  } catch (error) {
    console.warn('Hide banner failed', error);
  } finally {
    bannerVisible = false;
  }
};
