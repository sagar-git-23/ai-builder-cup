import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Package, Clock, MapPin, Thermometer } from 'lucide-react'
import StatusBadge from '../components/StatusBadge'
import { subscribeAvailableDonations, respondToDonation } from '../lib/firestoreService'

const categoryColor = {
  cooked: 'bg-orange-100 text-orange-700',
  bakery: 'bg-yellow-100 text-yellow-700',
  produce: 'bg-green-100 text-green-700',
  packaged: 'bg-blue-100 text-blue-700',
}

const RECIPIENT_ID = 'recipient-demo-01'

export default function RecipientPage() {
  const [donations, setDonations] = useState([])
  const [actions, setActions] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = subscribeAvailableDonations((data) => {
      setDonations(data)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const handle = async (donationId, action) => {
    setActions(a => ({ ...a, [donationId]: action }))
    await respondToDonation(donationId, RECIPIENT_ID, action)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Available Donations</h1>
      <p className="text-sm text-gray-500 mb-6">Review donations matched to your organisation by the agent. Accept or decline each allocation.</p>

      {loading && <p className="text-sm text-gray-400">Loading donations...</p>}

      {!loading && donations.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Package size={40} className="mx-auto mb-3 opacity-30" />
          <p>No donations available right now.</p>
        </div>
      )}

      <div className="space-y-4">
        {donations.map(d => {
          const action = actions[d.id]
          return (
            <div key={d.id} className={`bg-white rounded-2xl shadow p-5 border-l-4 ${action === 'accepted' ? 'border-green-400' : action === 'declined' ? 'border-red-300' : 'border-gray-200'}`}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="font-semibold text-gray-800">{d.food}</p>
                  <p className="text-xs text-gray-500 mt-0.5">from {d.donorName ?? 'Donor'}</p>
                </div>
                <StatusBadge state={d.state} />
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm text-gray-600 mb-4">
                <span className="flex items-center gap-1.5"><Package size={14} /> {d.quantity} {d.unit}</span>
                <span className="flex items-center gap-1.5"><Clock size={14} /> Deadline: {d.deadline || 'N/A'}</span>
                <span className="flex items-center gap-1.5"><MapPin size={14} /> {d.location ?? 'Location TBC'}</span>
                <span className="flex items-center gap-1.5"><Thermometer size={14} /> {d.storage || 'Not specified'}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${categoryColor[d.category] ?? 'bg-gray-100 text-gray-600'}`}>
                  {d.category ?? 'general'}
                </span>
                <div className="flex-1" />
                {!action ? (
                  <>
                    <button
                      onClick={() => handle(d.id, 'accepted')}
                      className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
                    >
                      <CheckCircle size={15} /> Accept
                    </button>
                    <button
                      onClick={() => handle(d.id, 'declined')}
                      className="flex items-center gap-1.5 border border-red-300 text-red-600 hover:bg-red-50 text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
                    >
                      <XCircle size={15} /> Decline
                    </button>
                  </>
                ) : (
                  <span className={`text-sm font-semibold flex items-center gap-1.5 ${action === 'accepted' ? 'text-green-600' : 'text-red-500'}`}>
                    {action === 'accepted' ? <CheckCircle size={16} /> : <XCircle size={16} />}
                    {action === 'accepted' ? 'Accepted — agent notified' : 'Declined — agent will replan'}
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
