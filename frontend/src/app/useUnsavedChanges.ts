import { useCallback, useEffect } from 'react'
import { useBeforeUnload, useBlocker } from 'react-router'

export function useUnsavedChanges(dirty: boolean) {
  const blocker = useBlocker(({ currentLocation, nextLocation, historyAction }) =>
    dirty && historyAction !== 'REPLACE' &&
    (currentLocation.pathname !== nextLocation.pathname || currentLocation.search !== nextLocation.search))
  useEffect(() => {
    if (blocker.state === 'blocked') {
      if (window.confirm('有尚未保存的修改。确定离开并放弃这些修改吗？')) blocker.proceed()
      else blocker.reset()
    }
  }, [blocker])
  useBeforeUnload(useCallback((event) => {
    if (!dirty) return
    event.preventDefault()
    event.returnValue = ''
  }, [dirty]))
}
