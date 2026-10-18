import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Package, Clock, MapPin, Thermometer } from 'lucide-react'
import StatusBadge from '../components/StatusBadge'
import { getRecipients, subscribeAvailableDonations } from '../lib/firestoreService'
import { apiRequest } from '../lib/api'

const categoryColor = {
  cooked: 'bg-orange-100 text-orange-700',
  bakery: 'bg-yellow-100 text-yellow-700',
  produce: 'bg-green-100 text-green-700',
  packaged: 'bg-blue-100 text-blue-700',
}

export default function RecipientPage() {
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
      .then(data => {
        setRecipients(data)
        if (data.length === 1) setRecipientId(data[0].id)
      })
      .catch(err => setError(err.message || 'Could not load recipient organizations.'))
    return () => unsub()
  }, [])

  const handle = async (donationId, action) => {
    const key = `${donationId}:${recipientId}`
    setBusyKey(key)
    setError('')
    try {
      // Call backend so agent can replan on decline
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

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Available Donations</h1>
      <p className="text-sm text-gray-500 mb-4">Choose your organization to see donations matched to it. Accepting creates a volunteer pickup job.</p>

      <label className="block text-sm font-medium text-gray-700 mb-5">
        Recipient organization
        <select
          value={recipientId}
          onChange={e => setRecipientId(e.target.value)}
          className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">Choose an organization</option>
          {recipients.map(recipient => (
            <option key={recipient.id} value={recipient.id}>{recipient.name}</option>
          ))}
        </select>
      </label>

      {error && <p className="text-sm text-red-600 mb-4" role="alert">{error}</p>}

      {loading && <p className="text-sm text-gray-400">Loading donations...</p>}

      {!loading && recipientId && offers.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Package size={40} className="mx-auto mb-3 opacity-30" />
          <p>No donations available right now.</p>
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
                      <CheckCircle size={15} /> Accept allocation
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
