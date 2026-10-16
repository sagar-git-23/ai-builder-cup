import { STATES } from '../data/mockData'

const colorMap = {
  [STATES.SUBMITTED]: 'bg-gray-100 text-gray-700',
  [STATES.EXTRACTING]: 'bg-blue-100 text-blue-700',
  [STATES.ELIGIBILITY_CHECK]: 'bg-yellow-100 text-yellow-700',
  [STATES.PLANNING]: 'bg-purple-100 text-purple-700',
  [STATES.COORDINATING]: 'bg-indigo-100 text-indigo-700',
  [STATES.RECOVERING]: 'bg-orange-100 text-orange-700',
  [STATES.AWAITING_APPROVAL]: 'bg-amber-100 text-amber-700',
  [STATES.VERIFIED]: 'bg-green-100 text-green-700',
  [STATES.FAILED]: 'bg-red-100 text-red-700',
  [STATES.REVIEW]: 'bg-rose-100 text-rose-700',
}

export default function StatusBadge({ state }) {
  return (
    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${colorMap[state] ?? 'bg-gray-100 text-gray-600'}`}>
      {state}
    </span>
  )
}
