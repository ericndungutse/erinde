## Referral & Encounter Integration: Architectural Specification

This document formalizes the mechanical relationship and data flow between **Referrals** and **Encounters** across the healthcare hierarchy.

---

### 1. Data Schema Architecture

#### Encounter Document
* **`id`**: Unique identifier.
* **`initiator`**: User ID who opened the encounter.
* **`state`**: `open` | `closed`.
* **`closeNote`**: Clinical summary (null while open).
* **`referralId`**: Optional link to an incoming `IReferral`.
* **`patientNumber`**: Unique patient identifier for discovery.
* **`openedAt`**: Timestamp of encounter creation.
* **`closedAt`**: Timestamp of encounter closure.
* **`hospitalId`**: ID of the hospital where the encounter is active.
* **`currentStep`**: `triage` | `consultation` | `lab` | `finished`.
* **`urgency`**: `low` | `medium` | `high` | `emergency`.
* **`diagnoses`**: `Array<IDiagnosis>`
    * **`code`**: String; ICD-11 identifier (e.g., `1F40`).
    * **`description`**: String; Human-readable clinical name.
    * **`isPrimary`**: Boolean; Identifies the chief reason for the encounter.
    * **`results`**: `Array<IFinding>` — Denormalized evidence supporting the conclusion.
        * **`status`**: `positive` | `negative`.
        * **`note`**: String; Free-text for additional context (e.g., "BP 90/60 mmHg"). 

##### Field Description: urgency
The urgency field is a clinical priority marker typically assigned during the triage step. It acts as the primary sorting mechanism for department queues, ensuring that life-threatening cases (emergency) are surfaced at the top of the dashboard, regardless of arrival time, while stable cases are handled in chronological order.


#### Referral Document (`IReferral`)
* **`fromType`**: `Hospital` | `CommunityHealthUnit`.
* **`status`**: `pending` | `received` | `completed`.
* **`encounterId`**: Link to the **active** receiving encounter.
* **`outcomeNote`**: Denormalized `closeNote` for CHU visibility. (If possible, will be replaced by encounterId of the referred to hospital only if the referral is from a CHU)
* **`assessments`**: Array of IDs for community screening data. Optional, only available for CHU referrals. Not used for hospital-to-hospital transfers.

---


### 2. Workflow Diagrams

##### Creation process

###### Patient Alredy exists with Patient Number
- Nurse search patient by patient number
- System Checks if there is an existing open encounter for the patient
    - To Be discussed: No multiple open encounter for a patient are allowed
- System checks if there is an existing referral for the patient.
    - If so, referral is linked to the encounter and referral status is updated to "In Progress"
    - If not, encounter is created without referral link
        - currentStep is set to "triage"
- If patient does not exists, nurse creates new patient and encounter is created without referral link
    - currentStep is set to "triage"

#### A. Community-to-Hospital (Feedback Loop)
*Logic: The CHU needs to know the outcome for community follow-up.*

```mermaid
sequenceDiagram
    participant CHU as CHU / Campaign
    participant REF as IReferral
    participant HSP as Receiving Hospital (Encounter)

    Note over CHU, REF: Stage 1: Intent
    CHU->>REF: Create Referral (status: pending, assessments: [IDs])
    
    Note over REF, HSP: Stage 2: The Handshake
    HSP->>REF: Discover & Link (patientNumber)
    rect rgb(240, 240, 240)
        HSP-->>REF: Set encounterId & status: received
        REF-->>HSP: Provide assessments context
    end

    Note over HSP: Stage 3: Clinical Process
    HSP->>HSP: Perform Consultation, Lab, Meds

    Note over HSP, CHU: Stage 4: Closing the Loop
    HSP->>HSP: Close Encounter (state: closed)
    rect rgb(200, 255, 200)
        HSP-->>REF: Sync closeNote -> outcomeNote
        HSP-->>REF: Set status: completed
        REF-->>CHU: Indicator: "Patient Seen & Outcome Available"
    end
```

#### B. Hospital-to-Hospital (Clinical Handover)
*Logic: Professional context moves forward; no backward "ping" required.*

```mermaid
sequenceDiagram
    participant HA as Hospital A (Origin)
    participant REF as IReferral
    participant HB as Hospital B (Receiving)

    Note over HA: Stage 1: Clinical Decision
    HA->>HA: Realize need for higher-level care
    HA->>REF: Create Referral (fromType: Hospital)
    HA-->>REF: Link sourceEncounterId: Encounter_A_ID
    HA->>HA: Close Encounter A (Transfer)

    Note over REF, HB: Stage 2: Handover
    HB->>REF: Discover Referral
    rect rgb(230, 240, 255)
        HB-->>REF: Set encounterId & status: received
        REF-->>HB: Provide sourceEncounterId
        HB->>HA: [System Fetch] Read Encounter A Notes
    end

    Note over HB: Stage 3: Specialized Care
    HB->>HB: Treat Patient
    HB->>HB: Close Encounter B (Final)
    
    Note over HA, HB: No Backward Notification Required
```

---

### 3. Error Handling: The Rebound Mechanic
To prevent administrative errors from "burning" a valid referral, the system must support an atomic reset.

```mermaid
graph TD
    A[Encounter Created in Error] --> B{Check Referral Link}
    B -- referralId exists --> C[Set Encounter state: closed]
    C --> D[Add closeNote: 'Created in Error']
    D --> E[Trigger Rebound Logic]
    E --> F[Set IReferral.encounterId = null]
    F --> G[Set IReferral.status = pending]
    G --> H[Referral is Discoverable Again]
    B -- No link --> C
```

---

### 4. Summary Table

| Source Type | Hospital Input Source | Feedback Logic |
| :--- | :--- | :--- |
| **CHU / Campaign** | `IReferral.assessments` | **Active:** Update `outcomeNote` & `status`. |
| **Hospital** | `IReferral.sourceEncounterId` | **Passive:** Forward context only. |


## 5. The Operational Workflow (`currentStep`)

The `currentStep` field acts as a **logical baton**, determining which department "owns" the patient record at any given time. While the `state` remains `open`, the `currentStep` dictates the UI visibility and the allowed clinical actions.

### A. Lifecycle Diagram

```mermaid
stateDiagram-v2
    [*] --> triage: [Trigger] Reception Opens Encounter
    
    triage --> consultation: [Trigger] Nurse Submits Vitals
    
    consultation --> lab: [Trigger] Doctor Orders Investigation
    consultation --> finished: [Trigger] Doctor Submits Diagnosis
    
    lab --> consultation: [Trigger] Tech Submits Results
    
    finished --> [*]: [Trigger] System/User sets state to 'closed'
```

### B. Step-by-Step Mechanical Detail

| Current Step | Primary Actor | Data Responsibilities | UI Logic (Dashboard) |
| :--- | :--- | :--- | :--- |
| **`triage`** | Nurse | Record Vitals (BP, Temp, Weight) and Urgency Score. | Encounter appears on **Nurse Queue**. |
| **`consultation`** | Doctor | Review Vitals, perform Physical Exam, prescribe Medication, or request Labs. | Encounter appears on **Doctor Queue**. |
| **`lab`** | Lab Tech | Collect samples, process tests, and record numerical/categorical results. | Encounter appears on **Lab Queue**. |
| **`finished`** | Doctor / Clerk | Finalize the `closeNote` (summary) and discharge the patient. | Encounter appears on **Discharge/Admin Queue**. |

### C. Logic of the "Lab Loop"
The transition from `lab` always returns to `consultation`. This is a strict mechanical requirement:
* **The Block:** A patient cannot move from `lab` to `finished`. 
* **The Reason:** A doctor must interpret the results of a lab test before a clinical outcome (`closeNote`) can be finalized.
* **The Action:** Saving lab results automatically triggers `currentStep: 'consultation'`.

### D. Closure Sequence
The move to the terminal state requires two distinct actions to maintain data integrity:
1.  **Clinical Completion:** The `currentStep` is moved to `finished` by the doctor.
2.  **Administrative Closure:** The system (or a clerk) sets `state: 'closed'`, which populates `closedAt` and triggers the **Referral Feedback Loop** (if the source was a CHU).

---

### Key Developer Notes for Implementation
* **Dashboard Filtering:** `const myQueue = encounters.filter(e => e.currentStep === userRole && e.state === 'open');`
* **Concurrency:** By updating `currentStep` at the end of each submission, you prevent two departments from accidentally editing the same encounter simultaneously.
* **Audit Trail:** Every change to `currentStep` should ideally be logged with a timestamp to calculate departmental "turnaround time" (TAT).

## 6. Attension
- Is there aposibility that a counter would be created and does not link to referral yet a referral exists? SOlved
- What if patient goes ot hospital with a referral but before due date?
    - Option one, reject
    - Option 2, probably patient is very sick, let nurse decide, show the warning "Patient has a pending referral due on {{dueDate}}. We advise you wait until the due date. if patient is very sick, you can proceed.    