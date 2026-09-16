<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1NOhUlzjEwqQ7qABC6O1Fhkpq9tTH1pc1

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Earn money from TodayPlan

The app supports two ways to get paid when a user generates a day plan:

1. **Rewarded ads (free for the user)** — on Android, Google AdMob plays a short video. You earn when the ad is watched. On web, a sponsored overlay is used until you add AdSense.
2. **Plan generation fee** — the wizard still charges a per-plan fee (default €2.00, editable in Admin). Users can pay to skip ads.

Banner ads also appear on the dashboard and plan result screens (AdMob on Android, a sponsored bar on web).

### Connect real AdMob (Android)

1. Create an account at [AdMob](https://apps.admob.google.com/) and add the Android app `com.todayplan.app`.
2. Create a **Banner** unit and a **Rewarded** unit.
3. Replace the sample app ID in `android/app/src/main/res/values/strings.xml` (`admob_app_id`).
4. In `.env.local`:

```
ADMOB_USE_TEST_ADS=false
ADMOB_BANNER_ID=ca-app-pub-xxxxxxxxxxxxxxxx/xxxxxxxxxx
ADMOB_REWARDED_ID=ca-app-pub-xxxxxxxxxxxxxxxx/xxxxxxxxxx
```

5. Rebuild and sync: `npm run android:sync`.

Until those IDs are set, the app uses Google's official **test** ads (no real revenue, no policy risk).

### Connect real card payments

The card form is still a Stripe mock (test card `4242…`). For live charges:

- **Website:** Stripe Checkout or a Payment Link (do not collect raw card numbers yourself).
- **Google Play Android app:** digital goods like “generate a plan” must use [Google Play Billing](https://developer.android.com/google/play/billing), not Stripe.

You can turn ads off in **Admin → Settings** if you only want the paid path.
