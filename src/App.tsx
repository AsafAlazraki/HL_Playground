import { useEffect } from 'react'
import { useProjectStore } from '@/store/useProjectStore'
import { Shell } from '@/app/Shell'

export default function App() {
  const loaded = useProjectStore((s) => s.loaded)
  const init = useProjectStore((s) => s.init)

  useEffect(() => {
    void init()
  }, [init])

  if (!loaded) return null
  return <Shell />
}
