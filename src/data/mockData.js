// Simulated donor organizations
export const donors = [
  { id: 'd1', name: 'The Riverside Restaurant', type: 'Restaurant', location: 'Byron Bay' },
  { id: 'd2', name: 'Green Grocer Co-op', type: 'Grocery', location: 'Lismore' },
  { id: 'd3', name: 'Sunrise Bakery', type: 'Bakery', location: 'Ballina' },
]

// Simulated recipient organizations
export const recipients = [
  { id: 'r1', name: 'Northern Rivers Community Kitchen', capacity: 50, accepts: ['cooked', 'produce', 'bakery'], location: 'Lismore', transport: true },
  { id: 'r2', name: 'Lismore Shelter', capacity: 20, accepts: ['cooked', 'bakery'], location: 'Lismore', transport: false },
  { id: 'r3', name: 'Byron Bay Food Bank', capacity: 40, accepts: ['produce', 'packaged', 'bakery'], location: 'Byron Bay', transport: true },
  { id: 'r4', name: 'Ballina Family Support', capacity: 15, accepts: ['cooked', 'produce'], location: 'Ballina', transport: false },
]

// Workflow states
export const STATES = {
  SUBMITTED: 'Submitted',
  EXTRACTING: 'Extracting Details',
  ELIGIBILITY_CHECK: 'Eligibility Check',
  PLANNING: 'Planning Redistribution',
  COORDINATING: 'Coordinating Pickup',
  RECOVERING: 'Recovering — Replanning',
  AWAITING_APPROVAL: 'Awaiting Human Approval',
  VERIFIED: 'Handoff Verified',
  FAILED: 'Failed',
  REVIEW: 'Held for Review',
}

// Simulated donations with full workflow history
export const initialDonations = [
  {
    id: 'don-001',
    donorId: 'd1',
    donorName: 'The Riverside Restaurant',
    food: 'Cooked mixed meals — pasta, salad, bread rolls',
    category: 'cooked',
    quantity: 35,
    unit: 'portions',
    preparedAt: '17:00',
    deadline: '21:00',
    storage: 'Hot-held above 60°C',
    image: null,
    state: STATES.VERIFIED,
    createdAt: '20:00',
    allocation: [
      { recipientId: 'r2', recipientName: 'Lismore Shelter', quantity: 20, status: 'confirmed' },
      { recipientId: 'r4', recipientName: 'Ballina Family Support', quantity: 15, status: 'confirmed' },
    ],
    agentLog: [
      { time: '20:00', type: 'extract', message: 'Extracted: 35 portions cooked meals, deadline 21:00, hot-held storage confirmed.' },
      { time: '20:02', type: 'validate', message: 'Eligibility check passed. Storage documented. Temperature compliant.' },
      { time: '20:03', type: 'plan', message: 'Searching recipients. Found: Northern Rivers Community Kitchen (cap 50), Lismore Shelter (cap 20).' },
      { time: '20:05', type: 'coordinate', message: 'Proposed: Recipient A (Northern Rivers CK) — 35 portions. Acceptance requested.' },
      { time: '20:10', type: 'tool_call', message: 'TOOL: request_acceptance({ recipient: "r1", quantity: 35 }) → accepted' },
      { time: '20:20', type: 'failure', message: 'FAILURE: Recipient A cancelled — transport unavailable.' },
      { time: '20:21', type: 'replan', message: 'Replanning. Remaining time: 40 min. Searching alternatives with transport or proximity.' },
      { time: '20:22', type: 'tool_call', message: 'TOOL: search_recipients({ category: "cooked", quantity: 35, deadline: "21:00" }) → [r2, r4]' },
      { time: '20:23', type: 'plan', message: 'New plan: Lismore Shelter (20 portions) + Ballina Family Support (15 portions). Deadline feasible.' },
      { time: '20:24', type: 'approval', message: 'APPROVAL REQUEST: Split allocation to r2 (20) + r4 (15). Awaiting coordinator sign-off.' },
      { time: '20:26', type: 'tool_call', message: 'TOOL: confirm_pickup({ recipient: "r2", quantity: 20 }) → confirmed' },
      { time: '20:27', type: 'tool_call', message: 'TOOL: confirm_pickup({ recipient: "r4", quantity: 15 }) → confirmed' },
      { time: '20:55', type: 'verify', message: 'Handoff evidence received. r2: 20 portions ✓  r4: 15 portions ✓. Donation complete.' },
    ],
  },
  {
    id: 'don-002',
    donorId: 'd3',
    donorName: 'Sunrise Bakery',
    food: 'Assorted bread loaves and pastries',
    category: 'bakery',
    quantity: 60,
    unit: 'items',
    preparedAt: '06:00',
    deadline: '14:00',
    storage: 'Room temperature, packaged',
    image: null,
    state: STATES.COORDINATING,
    createdAt: '12:30',
    allocation: [
      { recipientId: 'r3', recipientName: 'Byron Bay Food Bank', quantity: 40, status: 'confirmed' },
      { recipientId: 'r1', recipientName: 'Northern Rivers Community Kitchen', quantity: 20, status: 'pending' },
    ],
    agentLog: [
      { time: '12:30', type: 'extract', message: 'Extracted: 60 bakery items, room temp packaged, deadline 14:00.' },
      { time: '12:31', type: 'validate', message: 'Eligibility check passed. Packaged, within safe window.' },
      { time: '12:32', type: 'plan', message: 'Searching recipients accepting bakery items. Found: Byron Bay Food Bank (cap 40), Northern Rivers CK (cap 50).' },
      { time: '12:33', type: 'tool_call', message: 'TOOL: request_acceptance({ recipient: "r3", quantity: 40 }) → accepted' },
      { time: '12:34', type: 'tool_call', message: 'TOOL: request_acceptance({ recipient: "r1", quantity: 20 }) → pending' },
      { time: '12:35', type: 'coordinate', message: 'Awaiting confirmation from Northern Rivers CK for 20 items. Pickup scheduled 13:15.' },
    ],
  },
  {
    id: 'don-003',
    donorId: 'd2',
    donorName: 'Green Grocer Co-op',
    food: 'Mixed vegetables — zucchini, tomatoes, leafy greens',
    category: 'produce',
    quantity: 25,
    unit: 'kg',
    preparedAt: '08:00',
    deadline: '18:00',
    storage: null,
    image: null,
    state: STATES.REVIEW,
    createdAt: '09:15',
    allocation: [],
    agentLog: [
      { time: '09:15', type: 'extract', message: 'Extracted: 25 kg mixed produce, deadline 18:00. Storage information missing.' },
      { time: '09:16', type: 'validate', message: 'HOLD: Storage/temperature documentation not provided. Cannot confirm cold-chain compliance.' },
      { time: '09:17', type: 'review', message: 'Donation held for coordinator review. Follow-up question sent to donor: "Please confirm storage temperature and handling since harvest."' },
    ],
  },
]

// Pending approval requests
export const initialApprovals = [
  {
    id: 'appr-001',
    donationId: 'don-001',
    donorName: 'The Riverside Restaurant',
    description: 'Split allocation: Lismore Shelter (20 portions) + Ballina Family Support (15 portions) after original recipient cancelled.',
    requestedAt: '20:24',
    status: 'approved',
  },
]
