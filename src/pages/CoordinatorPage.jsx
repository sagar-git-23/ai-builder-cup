import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, ChevronDown, ChevronUp, Bot, AlertTriangle, BarChart2, Lock, Eye, EyeOff } from 'lucide-react'
import StatusBadge from '../components/StatusBadge'
import AgentLog from '../components/AgentLog'
import { subscribeDonations, subscribeApprovals, resolveApproval, subscribeAgentLogs } from '../lib/firestoreService'

const ADMIN_PIN = 'admin123'

function PinGate({ onUnlock }) {
  const [pin, setPin] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (pin === ADMIN_PIN) {
      onUnlock()
    } else {
      setError(true)
      setPin('')
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-purple-100 p-3 rounded-full mb-3">
            <Lock size={24} className="text-purple-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-800">Coordinator Access</h2>
          <p className="text-sm text-gray-500 mt-1 text-center">Enter your admin PIN to access the coordinator dashboard.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              value={pin}
              onChange={e => { setPin(e.target.value); setError(false) }}
              placeholder="Enter PIN"
              className={`w-full border rounded-xl px-4 py-2.5 text-sm pr-10 focus:outline-none focus:ring-2 ${error ? 'border-red-400 focus:ring-red-300' : 'focus:ring-purple-400'}`}
            />
            <button type="button" onClick={() => setShow(s => !s)} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
              {show ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
          {error && <p className="text-xs text-red-500">Incorrect PIN. Please try again.</p>}
          <button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2.5 rounded-xl transition-colors">
            Unlock Dashboard
          </button>
        </form>
      </div>
    </div>
  )
}

function DonationRow({ d }) {
  const [expanded, setExpanded] = useState(false)
  const [agentLog, setAgentLog] = useState([])

  useEffect(() => {
    if (!expanded) return
    const unsub = subscribeAgentLogs(d.id, (logs) => {
      setAgentLog(logs.map(l => ({
        ...l,
        time: l.time?.toDate?.()?.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }) ?? '--:--',
      })))
    })
    return () => unsub()
  }, [expanded, d.id])

  return (
    <div className="bg-white rounded-2xl shadow overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div>
          <p className="font-semibold text-gray-800 text-sm">{d.food}</p>
          <p className="text-xs text-gray-500">{d.donorName ?? 'Donor'} · {d.quantity} {d.unit} · deadline {d.deadline ?? 'N/A'}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge state={d.state} />
          {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t px-5 py-4 space-y-4">
          {d.allocation?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Allocation</p>
              <div className="space-y-1">
                {d.allocation.map((a, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{a.recipientName}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">{a.quantity} {d.unit}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${a.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {a.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1.5">
              <Bot size={13} /> Agent Activity Log
            </p>
            {agentLog.length === 0
              ? <p className="text-xs text-gray-400">No agent activity yet.</p>
              : <AgentLog log={agentLog} />
            }
          </div>
        </div>
      )}
    </div>
  )
}

export default function CoordinatorPage() {
  const [unlocked, setUnlocked] = useState(false)
  const [donations, setDonations] = useState([])
  const [approvals, setApprovals] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!unlocked) return
    const unsubD = subscribeDonations((data) => { setDonations(data); setLoading(false) })
    const unsubA = subscribeApprovals(setApprovals)
    return () => { unsubD(); unsubA() }
  }, [unlocked])

  if (!unlocked) return <PinGate onUnlock={() => setUnlocked(true)} />

  const pending = approvals.filter(a => a.status === 'pending')
  const resolved = approvals.filter(a => a.status !== 'pending')

  const metrics = [
    { label: 'Total Donations', value: donations.length, color: 'text-gray-800' },
    { label: 'Verified', value: donations.filter(d => d.state === 'Handoff Verified').length, color: 'text-green-600' },
    { label: 'In Progress', value: donations.filter(d => !['Handoff Verified', 'Failed', 'Held for Review'].includes(d.state)).length, color: 'text-indigo-600' },
    { label: 'Held for Review', value: donations.filter(d => d.state === 'Held for Review').length, color: 'text-rose-600' },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 mb-1">Coordinator Dashboard</h1>
        <p className="text-sm text-gray-500">Monitor agent decisions, approve actions, and track all donation workflows.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metrics.map(m => (
          <div key={m.label} className="bg-white rounded-2xl shadow p-4 text-center">
            <p className={`text-3xl font-bold ${m.color}`}>{m.value}</p>
            <p className="text-xs text-gray-500 mt-1">{m.label}</p>
          </div>
        ))}
      </div>

      {pending.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <AlertTriangle size={17} className="text-amber-500" /> Pending Approvals
          </h2>
          <div className="space-y-3">
            {pending.map(ap => (
              <div key={ap.id} className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                <p className="font-semibold text-gray-800 mb-1">{ap.donorName}</p>
                <p className="text-sm text-gray-600 mb-3">{ap.description}</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => resolveApproval(ap.id, 'approved')}
                    className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-1.5 rounded-lg"
                  >
                    <CheckCircle size={15} /> Approve
                  </button>
                  <button
                    onClick={() => resolveApproval(ap.id, 'rejected')}
                    className="flex items-center gap-1.5 border border-red-300 text-red-600 hover:bg-red-50 text-sm font-medium px-4 py-1.5 rounded-lg"
                  >
                    <XCircle size={15} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <BarChart2 size={17} className="text-gray-500" /> All Donations
        </h2>
        {loading
          ? <p className="text-sm text-gray-400">Loading donations...</p>
          : donations.length === 0
            ? <p className="text-sm text-gray-400">No donations yet.</p>
            : <div className="space-y-3">{donations.map(d => <DonationRow key={d.id} d={d} />)}</div>
        }
      </div>

      {resolved.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-gray-700 mb-3">Approval History</h2>
          <div className="space-y-2">
            {resolved.map(ap => (
              <div key={ap.id} className={`rounded-xl px-4 py-3 text-sm flex items-center justify-between ${ap.status === 'approved' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                <span>{ap.donorName} — {ap.description?.slice(0, 60)}…</span>
                <span className="font-semibold capitalize">{ap.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
