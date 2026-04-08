# Automated Referral

1. SHW

- From is user.chu.id
- FromType: CHU
- To: user.chu.healthCenter

2. Campaign

- From campaign.id
- FromType: Campain
- To: user.chu.healthCenter

# Manual Referral

- FROM: currrentLoggedInUser.hospital
- TO: requestBody OR Auto Locate hospital chain attached to hospital(Not Set up)
- FROMType: Hospital

=> from and fromType on assessment => leads to refferral from and fromType on referral

- A middleware to add from and fromType on assessment => leads to refferral from and fromType on referral

Up to now: Assessments Linked to takenFom and TakenFromType

NEXT TASK: Link referral to assessment and add from and fromType on referral based on assessment takenFrom and takenFromType

# Referral dashboard
# Referral dashboard

1. CHU
    - Assessments
        - Total today (Count)
        - Recent assessments (Listing)

    - Referrals
        - Aggregation
            - Total (Count)
            - Pending (Count)
            - Scheduled today (Count)
            - Completed Today (Count)
            - Overdue (Count)
        - Lists for dashboard
            - Scheduled today (List first 10)
            - Overdue (List first 10)

2. HOSPITAL
    - Aggregations
        - Total (Count)
        - Pending (Count)
        - Scheduled Today (Count)
        - Completed Today (Count)
        - Overdue (Count)

    - Lists for dashboard
        - New incoming referrals (List first 10)
        - Overdue referrals (List first 10)

3. OVERALL by ADMIN
    - System totals
        - Total referrals (Count)
        - Total assessments today (Count)
        - Active patients in referral pipeline (Count)
    - Cross-facility breakdown
        - By source type: CHU / Hospital / Campaign (Count)
        - By destination hospital (Top 10 by count)
        - By district/region (Count)
    - Status overview
        - Pending (Count)
        - In progress (Count)
        - Completed (Count)
        - Overdue (Count)
        - Cancelled (Count)
    - Trends
        - Daily referrals trend (Last 30 days)
        - Weekly trend (Last 12 weeks)
        - Monthly trend (Last 12 months)
        - Peak days/hours for incoming referrals
    - Quality & SLA
        - Overall completion rate (%)
        - Overdue rate (%)
        - Median time to completion
        - % handled within SLA
    - Exceptions & alerts
        - Hospitals with highest overdue load (Top 5)
        - CHUs with unusual referral spikes
        - Referrals pending > 7 days (List first 20)

## Status
- Aggregation/Metrics fro both CHU and Hospital dashboards are done, remaining is test

If you want, next step I can reshape this into exact API response objects per section (`chu`, `hospital`, `overallAdmin`) with field names ready for DTOs.
