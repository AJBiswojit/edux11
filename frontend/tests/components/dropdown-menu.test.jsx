// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LogOut, User } from 'lucide-react'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuGroup,
} from '../../src/components/ui/dropdown-menu.jsx'
import { act, keyDown, pointerDownAt, renderDom, settle, setRect } from '../setup/dom.js'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const cleanups = []
afterEach(() => {
  while (cleanups.length) cleanups.shift()()
  document.body.innerHTML = ''
})

function mount(ui) {
  const view = renderDom(ui)
  cleanups.push(view.unmount)
  return view
}

const menuTrigger = (view, index = 0) =>
  [...view.container.querySelectorAll('button[aria-haspopup="menu"]')][index]

/** Open the Nth menu in the view after giving its trigger a visible rect. */
async function openMenu(view, index = 0) {
  const trigger = menuTrigger(view, index)
  setRect(trigger, { top: 100 + index * 120, left: 100, width: 160, height: 40 })
  await act(async () => {
    trigger.click()
  })
  await settle()
  return trigger
}

/** Wait for the exit animation, then read the menu with the given id (null = closed). */
async function menuById(id) {
  await settle(250)
  return document.getElementById(id)
}

function basicMenu(id, group = null, extraItems = []) {
  return (
    <DropdownMenu group={group}>
      <DropdownMenuTrigger>Account</DropdownMenuTrigger>
      <DropdownMenuContent id={id}>
        <DropdownMenuLabel>Account</DropdownMenuLabel>
        <DropdownMenuItem icon={User}>Profile</DropdownMenuItem>
        <DropdownMenuItem icon={LogOut}>Sign out</DropdownMenuItem>
        {extraItems}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

describe('DropdownMenu — open/close', () => {
  it('opens on trigger click, closes on second click', async () => {
    const view = mount(basicMenu('dm-1'))
    const trigger = await openMenu(view)
    expect(document.getElementById('dm-1')).toBeTruthy()
    expect(trigger.getAttribute('aria-expanded')).toBe('true')

    await act(async () => {
      trigger.click()
    })
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(await menuById('dm-1')).toBeNull()
  })

  it('closes on outside click', async () => {
    const view = mount(basicMenu('dm-2'))
    await openMenu(view)
    const outside = document.createElement('div')
    document.body.appendChild(outside)
    await pointerDownAt(outside)
    expect(await menuById('dm-2')).toBeNull()
  })

  it('Escape closes and returns focus to the trigger', async () => {
    const view = mount(basicMenu('dm-3'))
    const trigger = await openMenu(view)
    await keyDown(document, 'Escape')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(trigger)
    expect(await menuById('dm-3')).toBeNull()
  })

  it('an item click runs its handler and closes the menu', async () => {
    const onProfile = vi.fn()
    const view = mount(
      <DropdownMenu>
        <DropdownMenuTrigger>Account</DropdownMenuTrigger>
        <DropdownMenuContent id="dm-4">
          <DropdownMenuItem onClick={onProfile}>Profile</DropdownMenuItem>
          <DropdownMenuItem>Settings</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    )
    await openMenu(view)
    const item = document.getElementById('dm-4').querySelector('button[role="menuitem"]')
    await act(async () => {
      item.click()
    })
    expect(onProfile).toHaveBeenCalledTimes(1)
    expect(await menuById('dm-4')).toBeNull()
  })
})

describe('DropdownMenu — group mutual exclusion', () => {
  it('within one group only one menu stays open', async () => {
    const view = mount(
      <>
        {basicMenu('dm-a', 'row-actions')}
        {basicMenu('dm-b', 'row-actions')}
      </>,
    )
    await openMenu(view, 0)
    expect(document.getElementById('dm-a')).toBeTruthy()
    await openMenu(view, 1)
    expect(document.getElementById('dm-b')).toBeTruthy()
    expect(await menuById('dm-a')).toBeNull() // sibling closed
  })

  it('menus in different groups can both stay open', async () => {
    const view = mount(
      <>
        {basicMenu('dm-x', 'group-a')}
        {basicMenu('dm-y', 'group-b')}
      </>,
    )
    await openMenu(view, 0)
    await openMenu(view, 1)
    expect(document.getElementById('dm-x')).toBeTruthy()
    expect(document.getElementById('dm-y')).toBeTruthy()
  })
})

describe('DropdownMenu — portal + semantics + keyboard', () => {
  it('portals to document.body by default and into the nearest data-portal-scope', async () => {
    const plain = mount(basicMenu('dm-p1'))
    await openMenu(plain)
    expect(document.getElementById('dm-p1').parentElement).toBe(document.body)

    const scoped = mount(
      <div data-portal-scope>{basicMenu('dm-p2')}</div>,
    )
    await openMenu(scoped)
    expect(document.getElementById('dm-p2').parentElement.hasAttribute('data-portal-scope')).toBe(true)
  })

  it('exposes menu/menuitem semantics with labels, separators and groups', async () => {
    const view = mount(
      <DropdownMenu>
        <DropdownMenuTrigger>Row</DropdownMenuTrigger>
        <DropdownMenuContent id="dm-sem">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuGroup>
            <DropdownMenuItem>Edit</DropdownMenuItem>
            <DropdownMenuItem>Duplicate</DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem checked>Starred</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    )
    await openMenu(view)
    const menu = document.getElementById('dm-sem')
    expect(menu.getAttribute('role')).toBe('menu')
    const items = [...menu.querySelectorAll('button[role="menuitem"]')]
    expect(items.map((i) => i.textContent.trim())).toEqual(['Edit', 'Duplicate', 'Starred'])
    expect(menu.textContent).toContain('Actions')
    expect(menu.querySelector('.h-px')).toBeTruthy() // separator
  })

  it('ArrowDown/ArrowUp/Home/End navigate items with visible focus', async () => {
    const view = mount(basicMenu('dm-kb'))
    await openMenu(view)
    const menu = document.getElementById('dm-kb')
    const items = [...menu.querySelectorAll('button[role="menuitem"]')]

    await keyDown(menu, 'ArrowDown')
    expect(document.activeElement).toBe(items[0])
    await keyDown(menu, 'ArrowDown')
    expect(document.activeElement).toBe(items[1])
    await keyDown(menu, 'Home')
    expect(document.activeElement).toBe(items[0])
    await keyDown(menu, 'End')
    expect(document.activeElement).toBe(items[1])
    await keyDown(menu, 'ArrowUp')
    expect(document.activeElement).toBe(items[0])
  })
})
