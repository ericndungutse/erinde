// IN progress referral status: means the referral has been accepted by the receiving hospital and is being processed. This status indicates that the patient is currently undergoing the referral process, which may include scheduling appointments, conducting assessments, or preparing for treatment. It signifies that the referral is actively being worked on and has not yet reached completion or cancellation.
// COMPLIETED referral status: indicates that the referral process has been successfully completed. This means that the patient has received the necessary care or treatment at the receiving hospital, and all required steps in the referral process have been fulfilled. The referral is considered closed, and no further action is needed.
// CANCELLED referral status: indicates that the referral process has been terminated before completion. This could occur for various reasons, such as the patient deciding not to proceed with the referral, the receiving hospital being unable to accommodate the referral, or other unforeseen circumstances. A cancelled referral is considered closed and does not require further action.
// RECEIVED referral status: indicates that the receiving hospital has acknowledged the referral and is aware of the patient's case. This status signifies that the referral has been successfully transmitted to the receiving hospital, but it does not necessarily mean that any action has been taken yet.
// ESCALATED referral status: indicates that the referral has been escalated to a higher level of care or attention. This could occur when the patient's condition requires urgent intervention or when there are complications that necessitate immediate attention from healthcare professionals. An escalated referral typically requires prompt action and may involve coordination between multiple healthcare providers.
export type ReferralStatus =
  | "PENDING"
  | "COMPLETED"
  | "CANCELLED"
  | "RECEIVED"
  | "IN_PROGRESS"
  | "ESCALATED";
