# Stakeholder Testing Guide (Admin → CHU → SHW → Nurse → Patient)

This guide is for all users, including those with no technical background. It explains what to click in the application, what to fill in, and how to interpret key features such as referrals, dashboard metrics, and nurse actions.

## What you will do (one complete sample run)

1. Login as **Admin**
2. Create a **Hospital (Health Center)**
3. Create a **Community Health Unit (CHU)** and create a **Social Health Worker** for it
4. Login as **Social Health Worker**
5. Register a **Patient** under the CHU you created


If you start from scratch, follow this order exactly. For a visual overview, see the flow below:

```mermaid
flowchart TD
      subgraph SHW[Social Health Worker]
         A1[Login]
         A2[View Referrals List]
         A3[View Dashboard]
         A4[Register Patient]
         A5[Perform Assessment]
         A6[Referral Created (if abnormal)]
         A7[View Referral Details]
         A8[Mark Referral as Visited (Nurse)]
      end
      subgraph Nurse
         N1[Login]
         N2[View Assigned Referrals]
         N3[Complete Referral]
      end
      subgraph Metrics
         M1[Pending Referrals]
         M2[Completed This Month]
         M3[Overdue Referrals]
         M4[Scheduled Today]
         M5[Completed Today]
      end
      A1 --> A2 --> A3
      A3 --> M1
      A3 --> M2
      A3 --> M3
      A3 --> M4
      A3 --> M5
      A2 --> A7
      A4 --> A5 --> A6 --> A2
      N1 --> N2 --> N3
      A7 --> N2
      N2 --> N3
```

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

---

## Interpreting Social Health Worker Dashboard Metrics & Stats

The SHW dashboard provides quick insights into your workload and performance:

- **Pending Referrals:** Number of patients needing follow-up.
- **Overdue Referrals:** Referrals that are past their scheduled visit date and still pending.
- **Scheduled Today:** Referrals scheduled for today.
- **Completed Today:** Referrals completed today.

These metrics help you prioritize urgent cases and track your progress.

**Example Dashboard Card:**

| Metric              | Meaning                                      |
|---------------------|----------------------------------------------|
| Pending             | Patients needing follow-up                   |
| Overdue             | Referrals not completed by scheduled date    |
| Scheduled Today     | Referrals scheduled for today                |
| Completed Today     | Referrals completed today                    |

---

## How Referrals Flow (Summary)

1. **Assessment**: SHW or volunteer performs an assessment for a patient.
2. **Referral Creation**: If the result is abnormal, a referral is created for follow-up.
3. **SHW Dashboard**: SHW sees new pending referrals and upcoming visits.
4. **Nurse Action**: Nurse completes the referral when the patient visits the hospital.
5. **Status Update**: Referral status changes to COMPLETED.

---

## Interpreting Assessment Results

When you perform an assessment, the system classifies the result as:
- **Healthy** (green): No action needed.
- **Warning** (amber): Monitor, may need follow-up.
- **Danger** (red): Referral is created for urgent follow-up.
- **Critical** (red, high emphasis): Immediate attention required; referral is created.

**Tip:** Always check the recommendations provided after each assessment.

---

## FAQ

**Q: What if I can’t find a patient’s referral?**
A: Make sure you are searching with the correct patient number. If the referral is not listed, check if it was already completed or cancelled.

**Q: Can I register a new patient as a nurse?**
A: No, only Social Health Workers and Admins can register new patients.

**Q: What happens if a referral is overdue?**
A: Overdue referrals appear in the dashboard. SHWs should prioritize these for follow-up.

---

For more details, see the API and business logic documentation in the `docs/` folder.
