// lib/lockState.js

let locked = false

export function isLocked() {
  return locked
}

export function setLocked(value) {
  locked = value
  return locked
}