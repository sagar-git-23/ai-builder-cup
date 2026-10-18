import { Link, useLocation } from 'react-router-dom'
import { Leaf } from 'lucide-react'

const links = [
  { to: '/', label: 'Home' },
  { to: '/donor', label: 'Donor' },
  { to: '/recipient', label: 'Recipient' },
  { to: '/driver', label: 'Driver' },
  { to: '/coordinator', label: 'Coordinator' },
]

export default function Navbar() {
  const { pathname } = useLocation()
  return (
    <nav className="bg-green-700 text-white px-6 py-3 flex items-center gap-6 shadow-md">
      <div className="flex items-center gap-2 font-bold text-lg mr-4">
        <Leaf size={22} />
        FoodRescue Agent
      </div>
      {links.map(l => (
        <Link
          key={l.to}
          to={l.to}
          className={`text-sm font-medium px-3 py-1 rounded transition-colors ${
            pathname === l.to ? 'bg-green-900' : 'hover:bg-green-600'
          }`}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  )
}
