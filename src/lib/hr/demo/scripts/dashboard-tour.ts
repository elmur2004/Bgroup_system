import type { JourneyScript } from '../types'

export const dashboardTourScript: JourneyScript = {
  id: 'dashboard.overview',
  module: 'Dashboard',
  title: 'Explore the Dashboard',
  estimatedSeconds: 60,
  intro: {
    headline: "Let's explore your dashboard",
    body: "In about a minute you'll understand every section of your HR dashboard — from headcount to payroll at a glance. I'll walk you through each widget.",
    ctaLabel: "Start the tour",
  },
  outro: {
    headline: "Dashboard mastered!",
    body: "You now know how to read your HR dashboard — employee stats, attendance, payroll, incidents, and alerts. This is your daily command center.",
    ctaLabel: "Finish",
  },
  steps: [
    {
      id: 'sidebar-nav',
      target: '[data-demo-id="sidebar-nav"]',
      placement: 'right',
      story: {
        title: 'Your navigation sidebar',
        body: "This sidebar is your main menu. It organizes everything — employees, attendance, payroll, reports, and settings. Let's start with the dashboard overview.",
      },
      await: { type: 'auto', delayMs: 3000 },
    },
    {
      id: 'stat-cards',
      target: '[data-demo-id="dashboard-stats"]',
      placement: 'bottom',
      story: {
        title: 'Key metrics at a glance',
        body: "These cards show your most important numbers: **Total Employees**, **Attendance Rate**, **Pending Overtime**, and **Payroll Budget**. They update in real-time.",
      },
      await: { type: 'auto', delayMs: 3500 },
    },
    {
      id: 'attendance-chart',
      target: '[data-demo-id="dashboard-attendance-chart"]',
      placement: 'right',
      story: {
        title: "Today's attendance breakdown",
        body: "This donut chart shows how many employees are **present**, **late**, **absent**, or **on leave** today. Hover over any segment for exact numbers.",
      },
      await: { type: 'auto', delayMs: 3000 },
    },
    {
      id: 'salary-chart',
      target: '[data-demo-id="dashboard-salary-chart"]',
      placement: 'left',
      story: {
        title: 'Department salary breakdown',
        body: "This bar chart compares payroll costs across departments — base salary, overtime, bonuses, and deductions. Spot budget anomalies fast.",
      },
      await: { type: 'auto', delayMs: 3000 },
    },
    {
      id: 'recent-incidents',
      target: '[data-demo-id="dashboard-incidents"]',
      placement: 'top',
      story: {
        title: 'Recent incidents',
        body: "The latest disciplinary incidents show up here — employee name, violation, and status. Click **View All** to see the full list.",
      },
      await: { type: 'auto', delayMs: 3000 },
    },
    {
      id: 'alerts-panel',
      target: '[data-demo-id="dashboard-alerts"]',
      placement: 'top',
      story: {
        title: 'System alerts',
        body: "Alerts flag things that need your attention — expiring contracts, employees on extended leave, payroll anomalies. Check these daily.",
      },
      await: { type: 'auto', delayMs: 3000 },
    },
    {
      id: 'nav-employees',
      target: '[data-demo-id="nav-employees"]',
      placement: 'right',
      story: {
        title: 'Ready to explore more?',
        body: "Click **Employees** in the sidebar to see your full employee directory. That's where you'll manage profiles, contracts, and more.",
      },
      await: { type: 'click', selector: '[data-demo-id="nav-employees"]' },
    },
  ],
}
