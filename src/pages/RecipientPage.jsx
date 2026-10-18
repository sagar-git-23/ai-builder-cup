import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Package, Clock, MapPin, Thermometer, Building2, ChevronRight, ArrowLeft } from 'lucide-react'
import StatusBadge from '../components/StatusBadge'
import { getRecipients, subscribeAvailableDonations } from '../lib/firestoreService'
import { apiRequest } from '../lib/api'

const categoryColor = {
  cooked: 'bg-orange-100 text-orange-700',
  bakery: 'bg-yellow-100 text-yellow-700',
  produce: 'bg-green-100 text-green-700',
  packaged: 'bg-blue-100 text-blue-700',
}

const ALL_CATEGORIES = ['cooked', 'bakery', 'produce', 'packaged']

function RegisterForm({ onRegistered }) {
  const [form, setForm] = useState({
    name: '', location: '', address: '', contact: '',
    capacity: '', capacityUnit: 'portions', transport: false,
  })
  const [accepts, setAccepts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const toggleCategory = (cat) =>
    setAccepts(a => a.includes(cat) ? a.filter(c => c !== cat) : [...a, cat])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (accepts.length === 0) { setError('Please select at least one food category.'); return }
    setLoading(true)
    setError('')
    try {
      const result = await apiRequest('/recipients', {
        method: 'POST',
        body: JSON.stringify({ ...form, capacity: parseFloat(form.capacity), accepts }),
      })
      onRegistered(result)
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Register Your Organisation</h1>
      <p className="text-sm text-gray-500 mb-6">Register once to start receiving matched food donations from the agent.</p>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Organisation name *</label>
          <input
            required
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="e.g. Lismore Community Kitchen"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Suburb / town *</label>
            <input
              required
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="e.g. Lismore"
              value={form.location}
              onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contact email *</label>
            <input
              required type="email"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="contact@org.com"
              value={form.contact}
              onChange={e => setForm(f => ({ ...f, contact: e.target.value }))}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Street address *</label>
          <input
            required
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="e.g. 12 Molesworth St, Lismore NSW 2480"
            value={form.address}
            onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Capacity *</label>
            <input
              required type="number" min="1"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="e.g. 50"
              value={form.capacity}
              onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={form.capacityUnit}
              onChange={e => setForm(f => ({ ...f, capacityUnit: e.target.value }))}
            >
              {['portions', 'kg', 'items', 'trays', 'boxes'].map(u => <option key={u}>{u}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Food categories accepted *</label>
          <div className="flex gap-2 flex-wrap">
            {ALL_CATEGORIES.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => toggleCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  accepts.includes(cat)
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="transport"
            checked={form.transport}
            onChange={e => setForm(f => ({ ...f, transport: e.target.checked }))}
            className="w-4 h-4 accent-blue-600"
          />
          <label htmlFor="transport" className="text-sm text-gray-700">We have our own transport for pickup</label>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {loading ? 'Registering...' : <> Register Organisation <ChevronRight size={18} /> </>}
        </button>
      </form>
    </div>
  )
}

export default function RecipientPage() {
  const [view, setView] = useState('select') // 'select' | 'register' | 'donations'
  const [donations, setDonations] = useState([])
  const [recipients, setRecipients] = useState([])
  const [recipientId, setRecipientId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyKey, setBusyKey] = useState('')

  useEffect(() => {
    const unsub = subscribeAvailableDonations((data) => {
      setDonations(data)
      setLoading(false)
    })
    getRecipients()
      .then(data => setRecipients(data))
      .catch(err => setError(err.message || 'Could not load recipient organizations.'))
    return () => unsub()
  }, [])

  const handleRegistered = (newRecipient) => {
    setRecipients(r => [...r, newRecipient])
    setRecipientId(newRecipient.id)
    setView('donations')
  }

  const handleSelect = () => {
    if (recipientId) setView('donations')
  }

  const handle = async (donationId, action) => {
    const key = `${donationId}:${recipientId}`
    setBusyKey(key)
    setError('')
    try {
      await apiRequest(`/donations/${donationId}/responses`, {
        method: 'POST',
        body: JSON.stringify({ recipientId, action }),
      })
    } catch (err) {
      setError(err.message || 'Could not submit your response.')
    } finally {
      setBusyKey('')
    }
  }

  const offers = donations.filter(d =>
    d.allocation?.some(item => item.recipientId === recipientId && item.status === 'pending')
  )

  if (view === 'register') return <RegisterForm onRegistered={handleRegistered} />

  if (view === 'select') return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Recipient Portal</h1>
      <p className="text-sm text-gray-500 mb-8">Select your organisation or register a new one to receive matched donations.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
        <div className="bg-white rounded-2xl shadow p-6">
          <Building2 size={28} className="text-blue-500 mb-3" />
          <h2 className="font-semibold text-gray-800 mb-1">Existing Organisation</h2>
          <p className="text-sm text-gray-500 mb-4">Select your organisation from the list to view matched donations.</p>
          <select
            value={recipientId}
            onChange={e => setRecipientId(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm bg-white mb-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="">Choose an organisation</option>
            {recipients.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <button
            onClick={handleSelect}
            disabled={!recipientId}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-semibold py-2 rounded-lg transition-colors"
          >
            View Donations
          </button>
        </div>

        <div
          onClick={() => setView('register')}
          className="bg-white rounded-2xl shadow p-6 border-2 border-dashed border-blue-200 hover:border-blue-400 cursor-pointer transition-colors"
        >
          <ChevronRight size={28} className="text-blue-400 mb-3" />
          <h2 className="font-semibold text-gray-800 mb-1">New Organisation</h2>
          <p className="text-sm text-gray-500">Register your community kitchen, shelter or NGO to start receiving food donations.</p>
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )

  // Donations view
  const selectedRecipient = recipients.find(r => r.id === recipientId)
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setView('select')} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{selectedRecipient?.name}</h1>
          <p className="text-sm text-gray-500">Donations matched to your organisation by the agent</p>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      {loading && <p className="text-sm text-gray-400">Loading donations...</p>}

      {!loading && offers.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Package size={40} className="mx-auto mb-3 opacity-30" />
          <p>No donations matched to your organisation right now.</p>
          <p className="text-xs mt-1">The agent will notify you when a suitable donation is available.</p>
        </div>
      )}

      <div className="space-y-4">
        {offers.map(d => {
          const allocation = d.allocation.find(item => item.recipientId === recipientId)
          const key = `${d.id}:${recipientId}`
          return (
            <div key={d.id} className="bg-white rounded-2xl shadow p-5 border-l-4 border-gray-200">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="font-semibold text-gray-800">{d.food}</p>
                  <p className="text-xs text-gray-500 mt-0.5">from {d.donorName ?? 'Donor'}</p>
                </div>
                <StatusBadge state={d.state} />
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm text-gray-600 mb-4">
                <span className="flex items-center gap-1.5"><Package size={14} /> {allocation.quantity} {d.unit}</span>
                <span className="flex items-center gap-1.5"><Clock size={14} /> Deadline: {d.deadline || 'N/A'}</span>
                <span className="flex items-center gap-1.5"><MapPin size={14} /> {d.location ?? 'Location TBC'}</span>
                <span className="flex items-center gap-1.5"><Thermometer size={14} /> {d.storage || 'Not specified'}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${categoryColor[d.category] ?? 'bg-gray-100 text-gray-600'}`}>
                  {d.category ?? 'general'}
                </span>
                <div className="flex-1" />
                {allocation.status === 'pending' ? (
                  <>
                    <button
                      disabled={busyKey === key}
                      onClick={() => handle(d.id, 'accepted')}
                      className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
                    >
                      <CheckCircle size={15} /> Accept
                    </button>
                    <button
                      disabled={busyKey === key}
                      onClick={() => handle(d.id, 'declined')}
                      className="flex items-center gap-1.5 border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50 text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
                    >
                      <XCircle size={15} /> Decline
                    </button>
                  </>
                ) : (
                  <span className={`text-sm font-semibold flex items-center gap-1.5 ${allocation.status === 'accepted' ? 'text-green-600' : 'text-red-500'}`}>
                    {allocation.status === 'accepted' ? <CheckCircle size={16} /> : <XCircle size={16} />}
                    {allocation.status === 'accepted' ? 'Accepted — pickup job created' : 'Declined — agent will replan'}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
