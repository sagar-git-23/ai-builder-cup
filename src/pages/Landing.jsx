import { useNavigate } from 'react-router-dom'
import { UtensilsCrossed, Building2, LayoutDashboard, Truck, Leaf } from 'lucide-react'

const roles = [
  {
    to: '/donor',
    icon: UtensilsCrossed,
    title: 'Donor',
    desc: 'Restaurants, bakeries, grocery stores — submit surplus food for redistribution.',
    color: 'border-green-400 hover:bg-green-50',
    iconColor: 'text-green-600',
  },
  {
    to: '/recipient',
    icon: Building2,
    title: 'Recipient',
    desc: 'Community kitchens, NGOs, shelters — view and accept available donations.',
    color: 'border-blue-400 hover:bg-blue-50',
    iconColor: 'text-blue-600',
  },
  {
    to: '/driver',
    icon: Truck,
    title: 'Volunteer Driver',
    desc: 'Accept pickup jobs, track deliveries, and confirm food handoffs.',
    color: 'border-yellow-400 hover:bg-yellow-50',
    iconColor: 'text-yellow-600',
  },
  {
    to: '/coordinator',
    icon: LayoutDashboard,
    title: 'Coordinator',
    desc: 'Monitor agent activity, approve decisions, and track all donation workflows.',
    color: 'border-purple-400 hover:bg-purple-50',
    iconColor: 'text-purple-600',
  },
]

export default function Landing() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex flex-col items-center justify-center px-4">
      <div className="text-center mb-10">
        <div className="flex items-center justify-center gap-3 mb-3">
          <Leaf size={36} className="text-green-600" />
          <h1 className="text-4xl font-bold text-green-800">FoodRescue Agent</h1>
        </div>
        <p className="text-gray-600 max-w-xl text-base">
          An agentic AI system that intelligently coordinates surplus food redistribution — from donation to verified handoff.
        </p>
        <div className="mt-3 flex justify-center gap-2 flex-wrap">
          {['Gemini AI', 'Firebase', 'Google Cloud', 'Agentic Workflow'].map(tag => (
            <span key={tag} className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">{tag}</span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-5xl">
        {roles.map(({ to, icon: Icon, title, desc, color, iconColor }) => (
          <button
            key={to}
            onClick={() => navigate(to)}
            className={`border-2 rounded-2xl p-6 text-left bg-white shadow-sm transition-all cursor-pointer ${color}`}
          >
            <Icon size={32} className={`mb-3 ${iconColor}`} />
            <h2 className="text-lg font-bold text-gray-800 mb-1">{title}</h2>
            <p className="text-sm text-gray-500">{desc}</p>
          </button>
        ))}
      </div>


    </div>
  )
}
