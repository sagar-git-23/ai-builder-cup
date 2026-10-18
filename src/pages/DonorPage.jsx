import { useState, useEffect } from 'react'
import { Bot, CheckCircle, AlertTriangle, ChevronRight } from 'lucide-react'
import AgentLog from '../components/AgentLog'
import StatusBadge from '../components/StatusBadge'
import { subscribeDonation, subscribeAgentLogs } from '../lib/firestoreService'
import { apiRequest } from '../lib/api'

const followUpQuestions = {
  storage: 'What is the current storage temperature or method (e.g. hot-held above 60°C, refrigerated below 5°C)?',
  time: 'What time was the food prepared or last temperature-checked?',
  deadline: 'What is the latest safe pickup time?',
  location: 'What suburb or town is the pickup in?',
  address: 'What is the pickup street address?',
  category: 'Please clarify what kind of food this is.',
  recipients: 'No complete recipient match is available yet. A coordinator will review the donation.',
}

export default function DonorPage() {
  const [form, setForm] = useState({
    donorName: '',
    food: '',
    quantity: '',
    unit: 'portions',
    preparedAt: '',
    deadline: '',
    storage: '',
    location: '',
    pickupAddress: '',
    notes: '',
  })
  const [submitted, setSubmitted] = useState(false)
  const [donationId, setDonationId] = useState(null)
  const [donation, setDonation] = useState(null)
  const [agentLog, setAgentLog] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!donationId) return undefined
    const unsubscribeDonation = subscribeDonation(donationId, setDonation)
    const unsubscribeLogs = subscribeAgentLogs(donationId, logs => {
      setAgentLog(logs.map(log => ({
        ...log,
        time: log.time?.toDate?.()?.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }) ?? '--:--',
      })))
    })
    return () => {
      unsubscribeDonation()
      unsubscribeLogs()
    }
  }, [donationId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      // Call FastAPI backend — it saves to Firestore AND runs the agent
      const result = await apiRequest('/donations', {
        method: 'POST',
        body: JSON.stringify({ ...form, quantity: parseFloat(form.quantity) }),
      })
      setDonationId(result.id)
      setSubmitted(true)
    } catch (err) {
      setError(err.message || 'Failed to submit donation. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setSubmitted(false)
    setDonationId(null)
    setDonation(null)
    setAgentLog([])
    setForm({
      donorName: '',
      food: '',
      quantity: '',
      unit: 'portions',
      preparedAt: '',
      deadline: '',
      storage: '',
      location: '',
      pickupAddress: '',
      notes: '',
    })
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Submit Surplus Food</h1>
      <p className="text-sm text-gray-500 mb-6">Describe your surplus food and the agent will coordinate the rest.</p>

      {!submitted ? (
        <form onSubmit={handleSubmit} className="space-y-5 bg-white rounded-2xl shadow p-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Donor organization *</label>
            <input
              required
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              placeholder="e.g. Riverside Restaurant"
              value={form.donorName}
              onChange={e => setForm(f => ({ ...f, donorName: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Food description *</label>
            <input
              required
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              placeholder="e.g. Cooked pasta, salad, bread rolls"
              value={form.food}
              onChange={e => setForm(f => ({ ...f, food: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
              <input
                required type="number" min="1"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                placeholder="35"
                value={form.quantity}
                onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                value={form.unit}
                onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
              >
                {['portions', 'kg', 'items', 'trays', 'boxes'].map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prepared at *</label>
              <input
                required
                type="time"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                value={form.preparedAt}
                onChange={e => setForm(f => ({ ...f, preparedAt: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pickup deadline *</label>
              <input
                required
                type="time"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                value={form.deadline}
                onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Storage / temperature *</label>
              <input
                required
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                placeholder="e.g. Hot-held above 60°C"
                value={form.storage}
                onChange={e => setForm(f => ({ ...f, storage: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pickup suburb / town *</label>
              <input
                required
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                placeholder="e.g. Lismore"
                value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pickup street address *</label>
            <input
              required
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              placeholder="Street address, suburb"
              value={form.pickupAddress}
              onChange={e => setForm(f => ({ ...f, pickupAddress: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Packaging notes</label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              placeholder="e.g. Individually packaged in sealed containers"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading ? 'Submitting...' : <> Submit Donation <ChevronRight size={18} /> </>}
          </button>
        </form>
      ) : (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl shadow p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-800">Donation Status</h2>
              {donation?.state && <StatusBadge state={donation.state} />}
            </div>
            <p className="text-sm text-gray-600"><span className="font-medium">Food:</span> {form.food}</p>
            <p className="text-sm text-gray-600"><span className="font-medium">Quantity:</span> {form.quantity} {form.unit}</p>
            {form.deadline && <p className="text-sm text-gray-600"><span className="font-medium">Deadline:</span> {form.deadline}</p>}
            {donation?.category && <p className="text-sm text-gray-600"><span className="font-medium">Category:</span> {donation.category}</p>}
            <p className="text-xs text-gray-400 mt-2">Donation ID: {donationId}</p>
          </div>

          {donation?.missingFields?.length > 0 && donation?.state === 'Held for Review' && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3 text-amber-700 font-semibold">
                <AlertTriangle size={18} /> Agent Follow-up Questions
              </div>
              <ul className="space-y-2">
                {donation.missingFields.map(k => (
                  <li key={k} className="text-sm text-amber-800 flex gap-2">
                    <Bot size={15} className="mt-0.5 shrink-0" />
                    {followUpQuestions[k]}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {donation?.state === 'Handoff Verified' && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3 text-green-700">
              <CheckCircle size={22} />
              <span className="font-semibold">Donation successfully coordinated and verified!</span>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow p-5">
            <div className="flex items-center gap-2 mb-3 text-gray-700 font-semibold">
              <Bot size={18} className="text-green-600" /> Agent Activity
            </div>
            {agentLog.length === 0
              ? <p className="text-sm text-gray-400">Waiting for agent to process donation...</p>
              : <AgentLog log={agentLog} />
            }
          </div>

          <button onClick={reset} className="text-sm text-green-700 underline">
            Submit another donation
          </button>
        </div>
      )}
    </div>
  )
}
