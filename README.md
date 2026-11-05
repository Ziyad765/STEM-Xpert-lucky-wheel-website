# ⚡ STEM-Xpert @ DIDAC India (Bangalore) | Lucky Spin Wheel & Queue System

An interactive, high-footfall **"Scan QR, Register & Spin to Win"** kiosk website built for **STEM-Xpert** at **DIDAC India 2026 (BIEC Bangalore)**.

---

## 🌟 Key Features

1. **12-Slice High-Stakes Wheel (50% "Better Luck", 100% Guaranteed Win)**:
   - Alternating slices between your 3 official courses and *"Better Luck Next Time"*.
   - Visitors think it's a 50/50 challenge!
   - **Guaranteed Win Logic**: *"Better Luck Next Time"* has `weight: 0` and `isLoss: true`. The wheel is mathematically programmed to **NEVER** stop on it! Every attendee wins one of the 3 real courses.

2. **Suspenseful Near-Miss Physics Animation**:
   - Fast, blurring initial spin (7.5-second total duration).
   - Progressive dramatic deceleration.
   - During the final 1.5 seconds, the wheel creeps slowly past a *"Better Luck Next Time"* slice... ticks agonizingly over the peg... and lands triumphantly on the winning course!

3. **Vercel Serverless Ready (Connect to GitHub & Deploy in 1 Click)**:
   - Configured with `vercel.json` and `api/index.js` for seamless deployment to Vercel Serverless.
   - Built-in dual real-time engine:
     - Uses WebSockets when running locally on Node.
     - Automatically falls back to high-reliability auto-sync polling on Vercel serverless functions!

4. **Smart QR Code System (Local Wi-Fi & Production Domain)**:
   - On Vercel: Automatically detects your production domain (e.g. `https://your-stem-wheel.vercel.app/register`). Anyone on any mobile network (4G/5G/Wi-Fi) can scan and open it!
   - On Local Wi-Fi: Detects your machine's Wi-Fi IP (e.g. `http://192.168.100.56:3000/register`) so phones on the same Wi-Fi can scan and test locally.
   - Includes an inline editable URL button to adjust the target in seconds.

5. **MongoDB Atlas Connected**:
   - Connected to `cluster0.qtdkyov.mongodb.net/stem_xpert_didac`.
   - Every lead, phone, school, course interest, and winning voucher is permanently saved in Atlas.

---

## 🚀 How to Deploy on Vercel via GitHub

### Step 1: Push to GitHub
```bash
git init
git add .
git commit -m "STEM-Xpert Lucky Wheel DIDAC"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

### Step 2: Import into Vercel
1. Go to [vercel.com](https://vercel.com) and click **"Add New Project"**.
2. Select your GitHub repository.
3. In **Environment Variables**, add:
   * **Name**: `MONGODB_URI`
   * **Value**: `mongodb+srv://ziyadkomakkal_db_user:ziyad@cluster0.qtdkyov.mongodb.net/stem_xpert_didac?retryWrites=true&w=majority`
4. Click **Deploy**!

Once deployed, open your Vercel URL on your booth tablet. The QR code will automatically point to `https://your-app.vercel.app/register` so any visitor's phone will scan and open it immediately!

---

## 📱 How to Test on Another Device Locally (Same Wi-Fi)

1. Make sure your phone and laptop are connected to the same Wi-Fi network.
2. The booth screen automatically displays your local network IP:
   `http://192.168.100.56:3000/register`
3. Point your phone camera at the QR code, or type `http://192.168.100.56:3000/register` into Safari or Chrome on your phone!
