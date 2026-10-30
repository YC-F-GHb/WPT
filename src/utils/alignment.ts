import type { PPTElement } from '@/types/slides'
import { getElementRange } from './element'

export type AlignmentTarget = 'selection' | 'slide'
export type AlignmentAction = 'left' | 'horizontal' | 'right' | 'top' | 'vertical' | 'bottom' | 'center' | 'distribute-horizontal' | 'distribute-vertical'
export interface AlignmentUnit { elements: PPTElement[]; minX: number; maxX: number; minY: number; maxY: number }

const bounds = (elements: PPTElement[]) => {
  const ranges = elements.map(element => {
    if (element.type !== 'line') return getElementRange(element)
    return { minX: element.left + Math.min(element.start[0], element.end[0]), maxX: element.left + Math.max(element.start[0], element.end[0]), minY: element.top + Math.min(element.start[1], element.end[1]), maxY: element.top + Math.max(element.start[1], element.end[1]) }
  })
  return { minX: Math.min(...ranges.map(r => r.minX)), maxX: Math.max(...ranges.map(r => r.maxX)), minY: Math.min(...ranges.map(r => r.minY)), maxY: Math.max(...ranges.map(r => r.maxY)) }
}

// A selected group moves as one object; a locked member locks the whole group.
export const alignmentUnits = (elements: PPTElement[], ids: string[], editingMember = ''): AlignmentUnit[] => {
  const selected = new Set(editingMember ? [editingMember] : ids)
  const groups = new Map<string, PPTElement[]>()
  for (const el of elements) {
    if (!selected.has(el.id)) continue
    const key = !editingMember && el.groupId ? `group:${el.groupId}` : `element:${el.id}`
    if (groups.has(key)) continue
    const members = !editingMember && el.groupId ? elements.filter(item => item.groupId === el.groupId) : [el]
    groups.set(key, members)
  }
  return [...groups.values()].filter(members => !members.some(el => el.lock)).map(members => ({ elements: members, ...bounds(members) }))
}

export const alignElements = (elements: PPTElement[], ids: string[], action: AlignmentAction, target: AlignmentTarget, width: number, height: number, editingMember = ''): PPTElement[] => {
  const units = alignmentUnits(elements, ids, editingMember)
  const distribution = action.startsWith('distribute-')
  if (!units.length || target === 'selection' && units.length < (distribution ? 3 : 2) || distribution && units.length < 2) return elements
  const ref = target === 'slide' ? {minX: 0, maxX: width, minY: 0, maxY: height} : bounds(units.flatMap(unit => unit.elements))
  const offsets = new Map<string, {x: number; y: number}>()
  const move = (unit: AlignmentUnit, x: number, y: number) => unit.elements.forEach(el => offsets.set(el.id, {x,y}))
  if (distribution) {
    const horizontal = action === 'distribute-horizontal'
    const min = horizontal ? 'minX' : 'minY'
    const max = horizontal ? 'maxX' : 'maxY'
    const sorted = [...units].sort((a,b) => a[min]-b[min])
    const span = ref[max]-ref[min]
    const gap = (span-sorted.reduce((total,u) => total+u[max]-u[min],0))/(sorted.length-1)
    let cursor = ref[min]
    sorted.forEach((u,index) => {
      // Keep extreme objects exactly in place when distributing within selection.
      const delta = target === 'selection' && (index === 0 || index === sorted.length-1) ? 0 : cursor-u[min]
      move(u,horizontal ? delta : 0,horizontal ? 0 : delta)
      cursor += u[max]-u[min]+gap
    })
  }
  else for (const unit of units) {
    let x=0,y=0
    if (action === 'left') x=ref.minX-unit.minX
    if (action === 'right') x=ref.maxX-unit.maxX
    if (action === 'horizontal' || action === 'center') x=(ref.minX+ref.maxX-unit.minX-unit.maxX)/2
    if (action === 'top') y=ref.minY-unit.minY
    if (action === 'bottom') y=ref.maxY-unit.maxY
    if (action === 'vertical' || action === 'center') y=(ref.minY+ref.maxY-unit.minY-unit.maxY)/2
    move(unit,x,y)
  }
  let changed=false
  const result=elements.map(el => {
    const d=offsets.get(el.id)
    if (!d || Math.abs(d.x)<1e-9 && Math.abs(d.y)<1e-9) return el
    changed=true
    return {...el,left:el.left+d.x,top:el.top+d.y}
  })
  return changed ? result : elements
}
