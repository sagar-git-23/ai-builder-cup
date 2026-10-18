import {
  collection, doc, onSnapshot,
  query, where, getDocs
} from 'firebase/firestore'
import { db } from './firebase'
import { apiRequest } from './api'

// ── Donations ──────────────────────────────────────────────

export function subscribeDonations(callback) {
  return onSnapshot(collection(db, 'donations'), snap =>
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  )
}

export function subscribeDonation(id, callback) {
  return onSnapshot(doc(db, 'donations', id), snap => callback({ id: snap.id, ...snap.data() }))
}

export async function createDonation(data) {
  return apiRequest('/donations', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateDonationState(id, state) {
  return apiRequest(`/donations/${id}/state`, {
    method: 'PATCH',
    body: JSON.stringify({ state }),
  })
}

// ── Agent logs ─────────────────────────────────────────────

export async function appendAgentLog(donationId, entry) {
  return apiRequest(`/donations/${donationId}/logs`, { method: 'POST', body: JSON.stringify(entry) })
}

export function subscribeAgentLogs(donationId, callback) {
  return onSnapshot(
    collection(db, 'donations', donationId, 'agentLogs'),
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  )
}

// ── Recipients ─────────────────────────────────────────────

export async function getRecipients() {
  const snap = await getDocs(collection(db, 'recipients'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export function subscribeAvailableDonations(callback) {
  const q = query(
    collection(db, 'donations'),
    where('state', 'in', ['Planning Redistribution', 'Coordinating Pickup'])
  )
  return onSnapshot(q, snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
}

export async function respondToDonation(donationId, recipientId, action) {
  return apiRequest(`/donations/${donationId}/responses`, {
    method: 'POST',
    body: JSON.stringify({ recipientId, action }),
  })
}

// ── Pickup jobs (drivers) ──────────────────────────────────

export function subscribePickupJobs(callback) {
  const q = query(collection(db, 'pickupJobs'))
  return onSnapshot(q, snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
}

export async function updateJobStatus(jobId, status) {
  return apiRequest(`/jobs/${jobId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

// ── Approvals ──────────────────────────────────────────────

export function subscribeApprovals(callback) {
  return onSnapshot(collection(db, 'approvals'),
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  )
}

export async function resolveApproval(approvalId, status) {
  return apiRequest(`/approvals/${approvalId}/resolve`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export async function coordinateDonation(donationId) {
  return apiRequest(`/donations/${donationId}/coordinate`, { method: 'POST' })
}
