# Stakeholder Testing Guide (Admin -> CHU -> Patient)

This guide is for people with no technical background. It explains what to click in the application and what to fill in.

## What you will do (one complete sample run)

1. Login as **Admin**
2. Create a **Hospital (Health Center)**
3. Create a **Community Health Unit (CHU)** and create a **Social Health Worker** for it
4. Login as **Social Health Worker**
5. Register a **Patient** under the CHU you created

If you start from scratch, follow this order exactly.

## Before you start (assumptions)

- The system already has **indicators** and **one Admin account**.
- You will not need referrals for this testing guide.
- The guide only covers: Hospitals, CHUs, and Patient registration.

## Step 1: Admin login

1. Open the application and go to the **Login** page.
2. Sign in with the Admin credentials your team provides (Email or Phone + Password).

## Step 2: Create a Hospital (Health Center)

1. In the left menu, open **Hospitals**.
2. Click **Create Hospital**.
3. Fill in:
   - **Hospital name**
   - **Hospital type** (choose **Health Center**)
   - **Hospital address**: Province, District, Sector, Cell, Village
4. Click **Create hospital**.

You do not need to copy any technical id. The next screen (CHU creation) will let you pick the health center by name.

## Step 3: Create a CHU (and create the Social Health Worker)

1. In the left menu, open **Community Health Units**.
2. Click **Create CHU**.
3. Fill in the **Community health unit** section:
   - **Health center**: select the health center you created (by its name in the dropdown)
   - **CHU address**: Province, District, Sector, Cell, Village
4. Look for **CHU name preview** (it is shown automatically based on village/cell). You can ignore the “technical meaning” of it.
5. In the **Social health worker link** section, since there is only the Admin in the database at the start:
   - choose **Create new worker**
6. Fill in the Social Health Worker details:
   - First name, Last name
   - Birthdate
   - National ID (16 digits)
   - Phone (10 digits, starting like `07...`)
7. Turn on **Use CHU address as SHW address** (recommended, to make it easier).
8. Click **Create CHU**.

### Password note for the new Social Health Worker

When the system creates a new Social Health Worker account during CHU creation, it uses the default password:

`Test@123`

So keep the Social Health Worker phone number you entered, because you will use it to login next.

## Step 4: Social Health Worker login

1. Log out (or close the session and return to the Login page).
2. Login using:
   - **Email or Phone**: use the Social Health Worker phone number you entered in Step 3
   - **Password**: use `Test@123`

## Step 5: Register a Patient under the CHU

1. In the left menu, open **Register Patient**.
2. Fill in the form:
   - Personal information: First name, Last name, Date of birth
   - National ID (16 digits)
   - Contact: Phone (and Email if you want)
   - Address: Province, District, Sector, Cell, Village
3. **Community Health Unit** field:
   - it is read-only and should auto-fill based on the Village + Cell you selected
   - if it stays empty, it usually means you selected a village/cell where no CHU exists yet—go back to Step 3 and create the CHU for that village/cell.
4. Click **Register Patient**.

## What success looks like

- After registration, you will see a screen showing:
  - **Patient Registered**
  - A **Patient Number** (this number is the reference to find that patient later)

## Out of scope for this guide

- **Referrals** (not included in this testing guide).
