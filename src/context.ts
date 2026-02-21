import type { GoeyPosition } from './types'

let position: GoeyPosition = 'bottom-right'
let spring = true
let bounce: number | undefined = undefined

export function setGoeyPosition(nextPosition: GoeyPosition) {
  position = nextPosition
}

export function getGoeyPosition() {
  return position
}

export function setGoeySpring(nextSpring: boolean) {
  spring = nextSpring
}

export function getGoeySpring() {
  return spring
}

export function setGoeyBounce(nextBounce: number | undefined) {
  bounce = nextBounce
}

export function getGoeyBounce() {
  return bounce
}
