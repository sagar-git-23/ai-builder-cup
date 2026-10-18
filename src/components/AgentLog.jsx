import { Bot, Wrench, AlertTriangle, CheckCircle, RefreshCw, Search, ClipboardCheck, Eye } from 'lucide-react'

const iconMap = {
  extract: { icon: Bot, color: 'text-blue-500' },
  validate: { icon: ClipboardCheck, color: 'text-yellow-600' },
  plan: { icon: Search, color: 'text-purple-500' },
  coordinate: { icon: Bot, color: 'text-indigo-500' },
  tool_call: { icon: Wrench, color: 'text-gray-500' },
  failure: { icon: AlertTriangle, color: 'text-red-500' },
  replan: { icon: RefreshCw, color: 'text-orange-500' },
  approval: { icon: Eye, color: 'text-amber-600' },
  verify: { icon: CheckCircle, color: 'text-green-600' },
  review: { icon: AlertTriangle, color: 'text-rose-500' },
}

export default function AgentLog({ log }) {
  return (
    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
      {log.map((entry, i) => {
        const { icon: Icon, color } = iconMap[entry.type] ?? { icon: Bot, color: 'text-gray-400' }
        const isTool = entry.type === 'tool_call'
        return (
          <div key={i} className={`flex gap-3 text-sm ${isTool ? 'bg-gray-50 rounded px-2 py-1 font-mono text-xs' : ''}`}>
            <div className="mt-0.5 shrink-0">
              <Icon size={15} className={color} />
            </div>
            <div className="flex-1">
              <span className="text-gray-400 mr-2">{entry.time}</span>
              <span className={isTool ? 'text-gray-600' : 'text-gray-800'}>{entry.message}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
