import {
  collection, doc, addDoc, updateDoc, onSnapshot,
  query, where, orderBy, serverTimestamp, getDocs
} from 'firebase/firestore'
import { db } from './firebase'

// ── Donations ──────────────────────────────────────────────

export function subscribeDonations(callback) {
  const q = query(collection(db, 'donations'), orderBy('createdAt', 'desc'))
  return onSnapshot(q, snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
}

export function subscribeDonation(id, callback) {
  return onSnapshot(doc(db, 'donations', id), snap => callback({ id: snap.id, ...snap.data() }))
}

export async function createDonation(data) {
  return addDoc(collection(db, 'donations'), { ...data, createdAt: serverTimestamp(), state: 'Submitted' })
}

export async function updateDonationState(id, state) {
  return updateDoc(doc(db, 'donations', id), { state })
}

// ── Agent logs ─────────────────────────────────────────────

export async function appendAgentLog(donationId, entry) {
  return addDoc(collection(db, 'donations', donationId, 'agentLogs'), {
    ...entry,
    time: serverTimestamp(),
  })
}

export function subscribeAgentLogs(donationId, callback) {
  const q = query(collection(db, 'donations', donationId, 'agentLogs'), orderBy('time', 'asc'))
  return onSnapshot(q, snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
}

// ── Recipients ─────────────────────────────────────────────

export async function getRecipients() {
  const snap = await getDocs(collection(db, 'recipients'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export function subscribeAvailableDonations(callback) {
  const q = query(
    collection(db, 'donations'),
    where('state', 'in', ['Planning Redistribution', 'Coordinating Pickup']),
    orderBy('createdAt', 'desc')
  )
  return onSnapshot(q, snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
}

export async function respondToDonation(donationId, recipientId, action) {
  return addDoc(collection(db, 'donations', donationId, 'recipientResponses'), {
    recipientId,
    action,
    respondedAt: serverTimestamp(),
  })
}

// ── Pickup jobs (drivers) ──────────────────────────────────

export function subscribePickupJobs(callback) {
  const q = query(collection(db, 'pickupJobs'), where('status', '==', 'available'))
  return onSnapshot(q, snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
}

export async function updateJobStatus(jobId, status) {
  return updateDoc(doc(db, 'pickupJobs', jobId), { status, updatedAt: serverTimestamp() })
}

// ── Approvals ──────────────────────────────────────────────

export function subscribeApprovals(callback) {
  const q = query(collection(db, 'approvals'), orderBy('requestedAt', 'desc'))
  return onSnapshot(q, snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
}

export async function resolveApproval(approvalId, status) {
  return updateDoc(doc(db, 'approvals', approvalId), { status, resolvedAt: serverTimestamp() })
}
