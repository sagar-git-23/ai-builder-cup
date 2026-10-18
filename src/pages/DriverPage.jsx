import { useState, useEffect } from 'react'
import { Truck, MapPin, Clock, Package, CheckCircle, XCircle, Navigation, ArrowRight } from 'lucide-react'
import StatusBadge from '../components/StatusBadge'
import { subscribePickupJobs } from '../lib/firestoreService'
import { apiRequest } from '../lib/api'

const stepLabels = ['Job Accepted', 'En Route to Pickup', 'Food Picked Up', 'En Route to Dropoff', 'Delivered']

export default function DriverPage() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeJob, setActiveJob] = useState(null)
  const [step, setStep] = useState(0)
  const [delivered, setDelivered] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const unsub = subscribePickupJobs((data) => {
      setJobs(data)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    if (activeJob) return
    const stepByStatus = {
      accepted: 0,
      en_route_pickup: 1,
      picked_up: 2,
      en_route_dropoff: 3,
    }
    const inProgress = jobs.find(job => Object.hasOwn(stepByStatus, job.status))
    if (inProgress) {
      setActiveJob(inProgress)
      setStep(stepByStatus[inProgress.status])
      setDelivered(false)
    }
  }, [jobs, activeJob])

  const handleAccept = async (job) => {
    setError('')
    try {
      await apiRequest(`/jobs/${job.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'accepted' }),
      })
      setActiveJob(job)
      setStep(0)
      setDelivered(false)
    } catch (err) {
      setError(err.message || 'Could not accept this pickup job.')
    }
  }

  const handleDecline = async (id) => {
    setError('')
    try {
      await apiRequest(`/jobs/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'declined' }),
      })
      if (activeJob?.id === id) setActiveJob(null)
    } catch (err) {
      setError(err.message || 'Could not decline this pickup job.')
    }
  }

  const advance = async () => {
    if (step < stepLabels.length - 1) {
      const nextStepStatus = {
        1: 'en_route_pickup',
        2: 'picked_up',
        3: 'en_route_dropoff',
      }[step + 1]
      if (nextStepStatus) {
        try {
          await apiRequest(`/jobs/${activeJob.id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status: nextStepStatus }),
          })
        } catch (err) {
          setError(err.message || 'Could not update pickup progress.')
          return
        }
      }
      setStep(s => s + 1)
    } else {
      try {
        // Backend marks donation as Handoff Verified when job completes
        await apiRequest(`/jobs/${activeJob.id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'completed' }),
        })
        setDelivered(true)
      } catch (err) {
        setError(err.message || 'Could not confirm delivery.')
      }
    }
  }

  const available = jobs.filter(j => j.status === 'available')
  const completed = jobs.filter(j => j.status === 'completed')

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 mb-1">Volunteer Driver</h1>
        <p className="text-sm text-gray-500">Pick up available delivery jobs assigned by the agent and confirm handoffs.</p>
      </div>

      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}

      {activeJob && !delivered && (
        <div className="bg-white rounded-2xl shadow p-5 border-l-4 border-green-500">
          <div className="flex items-center gap-2 mb-4 text-green-700 font-semibold">
            <Truck size={18} /> Active Job
          </div>

          <div className="flex items-center gap-1 mb-5 overflow-x-auto pb-1">
            {stepLabels.map((label, i) => (
              <div key={i} className="flex items-center gap-1 shrink-0">
                <div className="flex flex-col items-center">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${i < step ? 'bg-green-500 border-green-500 text-white' : i === step ? 'border-green-500 text-green-600 bg-green-50' : 'border-gray-200 text-gray-400'}`}>
                    {i < step ? <CheckCircle size={14} /> : i + 1}
                  </div>
                  <span className={`text-xs mt-1 text-center w-16 leading-tight ${i === step ? 'text-green-600 font-medium' : 'text-gray-400'}`}>{label}</span>
                </div>
                {i < stepLabels.length - 1 && (
                  <div className={`h-0.5 w-6 mb-4 ${i < step ? 'bg-green-400' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm text-gray-600 mb-4">
            <div className="flex items-start gap-2">
              <MapPin size={15} className="text-green-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-gray-700">Pickup</p>
                <p>{activeJob.pickupName}</p>
                <p className="text-xs text-gray-400">{activeJob.pickupAddress}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin size={15} className="text-blue-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-gray-700">Dropoff</p>
                <p>{activeJob.dropoffName}</p>
                <p className="text-xs text-gray-400">{activeJob.dropoffAddress}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
            <span className="flex items-center gap-1"><Package size={14} /> {activeJob.quantity}</span>
            <span className="flex items-center gap-1"><Clock size={14} /> Deadline {activeJob.deadline}</span>
            <span className="flex items-center gap-1"><Navigation size={14} /> {activeJob.distance} · {activeJob.duration}</span>
          </div>

          <button
            onClick={advance}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {step === stepLabels.length - 1 ? 'Confirm Delivery & Handoff' : `Mark: ${stepLabels[step + 1]}`}
            <ArrowRight size={17} />
          </button>
        </div>
      )}

      {delivered && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5 flex items-center gap-3 text-green-700">
          <CheckCircle size={24} />
          <div>
            <p className="font-semibold">Delivery confirmed!</p>
            <p className="text-sm">{activeJob.food} delivered to {activeJob.dropoffName}. Handoff recorded by agent.</p>
          </div>
        </div>
      )}

      {loading && <p className="text-sm text-gray-400">Loading jobs...</p>}

      {available.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-gray-700 mb-3">Available Jobs</h2>
          <div className="space-y-4">
            {available.map(job => (
              <div key={job.id} className="bg-white rounded-2xl shadow p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="font-semibold text-gray-800">{job.food}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{job.quantity}</p>
                  </div>
                  {job.state && <StatusBadge state={job.state} />}
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                  <MapPin size={13} className="text-green-500" />
                  <span className="font-medium">From:</span> {job.pickupName}
                  <ArrowRight size={13} className="text-gray-400" />
                  <span className="font-medium">To:</span> {job.dropoffName}
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                  <span className="flex items-center gap-1"><Clock size={13} /> Deadline {job.deadline}</span>
                  <span className="flex items-center gap-1"><Navigation size={13} /> {job.distance} · {job.duration}</span>
                </div>

                <div className="flex gap-3">
                  <button
                    disabled={Boolean(activeJob && !delivered)}
                    onClick={() => handleAccept(job)}
                    className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
                  >
                    <CheckCircle size={15} /> Accept Job
                  </button>
                  <button
                    onClick={() => handleDecline(job.id)}
                    className="flex items-center gap-1.5 border border-red-300 text-red-600 hover:bg-red-50 text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
                  >
                    <XCircle size={15} /> Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && available.length === 0 && !activeJob && completed.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Truck size={40} className="mx-auto mb-3 opacity-30" />
          <p>No jobs available right now. Check back soon.</p>
        </div>
      )}

      {completed.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-gray-700 mb-3">Completed Deliveries</h2>
          <div className="space-y-2">
            {completed.map(job => (
              <div key={job.id} className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center justify-between text-sm">
                <span className="text-gray-700">{job.food} → {job.dropoffName}</span>
                <span className="text-green-600 font-semibold flex items-center gap-1"><CheckCircle size={14} /> Delivered</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
