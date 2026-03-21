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
