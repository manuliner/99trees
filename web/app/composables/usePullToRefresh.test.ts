/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest'
import { hasVerticalScrollOverflow, isNestedScrollContainer } from './usePullToRefresh'

describe('hasVerticalScrollOverflow', () => {
  it('returns true when overflow-y is scrollable and content exceeds viewport', () => {
    expect(hasVerticalScrollOverflow('auto', 200, 100)).toBe(true)
    expect(hasVerticalScrollOverflow('scroll', 200, 100)).toBe(true)
    expect(hasVerticalScrollOverflow('overlay', 200, 100)).toBe(true)
  })

  it('returns false when overflow-y is not scrollable', () => {
    expect(hasVerticalScrollOverflow('visible', 200, 100)).toBe(false)
    expect(hasVerticalScrollOverflow('hidden', 200, 100)).toBe(false)
  })

  it('returns false when content fits within client height', () => {
    expect(hasVerticalScrollOverflow('auto', 100, 100)).toBe(false)
    expect(hasVerticalScrollOverflow('auto', 101, 100)).toBe(false)
  })
})

describe('isNestedScrollContainer', () => {
  function scrollableParent(height = 200, scrollHeight = 500): HTMLDivElement {
    const parent = document.createElement('div')
    parent.style.overflowY = 'auto'
    Object.defineProperty(parent, 'clientHeight', { value: height, configurable: true })
    Object.defineProperty(parent, 'scrollHeight', { value: scrollHeight, configurable: true })
    return parent
  }

  it('returns true when touch target is inside a scrollable overflow-y container', () => {
    const parent = scrollableParent()
    const child = document.createElement('button')
    parent.appendChild(child)
    document.body.appendChild(parent)

    expect(isNestedScrollContainer(child)).toBe(true)
  })

  it('returns false when only document root is scrollable', () => {
    expect(isNestedScrollContainer(document.body)).toBe(false)
    expect(isNestedScrollContainer(document.documentElement)).toBe(false)
  })

  it('returns false for non-element targets', () => {
    expect(isNestedScrollContainer(null)).toBe(false)
    expect(isNestedScrollContainer({} as EventTarget)).toBe(false)
  })

  it('returns false when overflow-y is auto but content does not overflow', () => {
    const parent = scrollableParent(200, 200)
    const child = document.createElement('span')
    parent.appendChild(child)
    document.body.appendChild(parent)

    expect(isNestedScrollContainer(child)).toBe(false)
  })
})
