# Auto Wizard — Apple App Store Connect Submission Guide

## App Identity

| Field | Value |
|---|---|
| **App Name** | Auto Wizard |
| **Bundle ID** | com.getautowizard.app |
| **SKU** | GETAUTOWIZARD-IOS-001 |
| **Primary Language** | English (U.S.) |
| **Platform** | iOS |
| **Version** | 1.0.0 |
| **Build Number** | 1 |
| **Website** | https://getautowizard.com |

---

## Step 1 — Create the App in App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com) and sign in with your Apple Developer account.
2. Click **My Apps → (+) New App**.
3. Fill in the fields exactly as shown in the App Identity table above.
4. For **Bundle ID**, choose **com.getautowizard.app** (you must register this first in [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers/list)).
5. Set **User Access** to **Full Access**.
6. Click **Create**.

---

## Step 2 — App Information (General)

| Field | Value |
|---|---|
| **Subtitle** | AI Car Care & Maintenance |
| **Category** | Utilities (Primary), Lifestyle (Secondary) |
| **Content Rights** | No third-party content |
| **Age Rating** | 4+ (no objectionable content) |

---

## Step 3 — App Store Listing Copy

### Description (up to 4,000 characters)

> Auto Wizard is your AI-powered car care companion. Whether you're hearing a strange noise, seeing a warning light, or just trying to stay on top of maintenance, Auto Wizard has you covered.
>
> **AI Mechanic Chat** — Ask our AI mechanic anything about your car. Get instant, expert answers about symptoms, warning lights, maintenance schedules, and repair costs — available 24/7.
>
> **AI Diagnosis** — Describe a symptom or upload a photo of a vehicle problem and get an instant AI diagnosis with severity rating, estimated repair cost, and exactly what to tell your mechanic.
>
> **Garage** — Add all your vehicles and track their health in one place. See what's due next and get a health score for each car.
>
> **Service History** — Log every oil change, tire rotation, brake job, and repair. Keep a complete maintenance record for every vehicle you own.
>
> **Maintenance Reminders** — Never miss an oil change or tire rotation again. Set reminders by mileage or date and get notified before things become problems.
>
> Auto Wizard is designed for everyday drivers who want to take better care of their cars without needing to be a mechanic. Save money, avoid breakdowns, and drive with confidence.

### Keywords (100 characters max, comma-separated)

`car maintenance,auto repair,vehicle tracker,oil change,mechanic,car care,vehicle health,AI diagnosis`

### What's New (for version 1.0.0)

> Welcome to Auto Wizard! Your AI-powered car care companion is here. Chat with our AI mechanic, diagnose problems by photo or symptom, track your vehicles, and stay on top of every maintenance task.

---

## Step 4 — Pricing and Availability

| Field | Value |
|---|---|
| **Price** | Free (with optional in-app purchases) |
| **Availability** | All countries and regions (or select specific markets) |
| **Pre-Order** | Not required for initial launch |

---

## Step 5 — App Privacy

The app collects the following data. You must complete the **App Privacy** section in App Store Connect accurately.

| Data Type | Collected | Linked to User | Used for Tracking |
|---|---|---|---|
| Email address | Yes (via Supabase auth) | Yes | No |
| Photos / Camera | Yes (for AI diagnosis) | No | No |
| Usage data | Yes (Supabase analytics) | Yes | No |
| Crash data | No | — | — |

Select **"Yes, we collect data from this app"** and fill in the privacy nutrition label accordingly.

**Privacy Policy URL** (required): You must publish a privacy policy at your domain before submission. A simple page at `https://getautowizard.com/privacy` is sufficient.

---

## Step 6 — App Review Information

| Field | Value |
|---|---|
| **First Name** | Christopher |
| **Last Name** | Swofford |
| **Phone** | Your phone number |
| **Email** | Your Apple Developer email |
| **Demo Account** | Provide a test account (email + password) that reviewers can use to log in |
| **Notes** | "The app uses an AI proxy via Supabase Edge Functions to power the Diagnose and AI Chat features. A working internet connection is required. The demo account has pre-populated vehicle data for review." |

---

## Step 7 — Screenshots Required

Apple requires screenshots for each device size you support. At minimum, provide:

| Device | Size | Count |
|---|---|---|
| iPhone 6.9" (iPhone 16 Pro Max) | 1320 × 2868 px | 3–10 |
| iPhone 6.5" (iPhone 14 Plus) | 1242 × 2688 px | 3–10 |
| iPhone 5.5" (iPhone 8 Plus) | 1242 × 2208 px | 3–10 |

**Recommended screenshot sequence:**
1. Home / Garage screen with vehicle cards
2. AI Mechanic Chat in action
3. Diagnose screen with a result
4. Service History
5. Add Vehicle form

Screenshots can be created using the iOS Simulator in Xcode or by running the app on a real device.

---

## Step 8 — Build Upload (EAS Build)

The project is configured with EAS (`eas.json`). Run the following to build and submit:

```bash
# Install EAS CLI if not already installed
npm install -g eas-cli

# Log in to your Expo account
eas login

# Build for iOS App Store
eas build --platform ios --profile production

# Submit to App Store Connect (after build completes)
eas submit --platform ios
```

The EAS project ID is already set in `app.json`: `c51bef75-3daa-43e7-967d-36dfa2f62fad`.

---

## Step 9 — Pre-Submission Checklist

Before clicking **Submit for Review**, confirm all of the following:

- [ ] Bundle ID `com.getautowizard.app` registered in Apple Developer portal
- [ ] App icon (1024×1024 px, no alpha channel) uploaded
- [ ] All required screenshot sizes uploaded
- [ ] App description, keywords, and subtitle filled in
- [ ] Privacy policy URL live and accessible
- [ ] App Privacy nutrition label completed in App Store Connect
- [ ] Demo account credentials entered in App Review Information
- [ ] In-app purchase products configured (if applicable)
- [ ] Build uploaded via EAS and processed (status: Ready to Submit)
- [ ] Version set to 1.0.0, build number 1
- [ ] Export compliance answered (ITSAppUsesNonExemptEncryption = false already set in app.json)

---

## GitHub Repository

The source code is version-controlled at:
**https://github.com/ChristopherSwofford418/auto-wizard** (private)

All changes should be committed and pushed before each EAS build to maintain a clean history.
