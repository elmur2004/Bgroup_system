import { dashboardTourScript } from './dashboard-tour'
import { employeesTourScript } from './employees-tour'
import type { JourneyScript } from '../types'

export const allScripts: JourneyScript[] = [
  dashboardTourScript,
  employeesTourScript,
]

export { dashboardTourScript, employeesTourScript }
