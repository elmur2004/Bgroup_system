import type { JourneyScript } from '../types'

export const employeesTourScript: JourneyScript = {
  id: 'employees.manage-employees',
  module: 'Employees',
  title: 'Managing Employees',
  estimatedSeconds: 90,
  intro: {
    headline: "Let's manage your employees",
    body: "You'll learn how to search, filter, and view employee profiles — plus how to add a new team member. This is the core of your HR system.",
    ctaLabel: "Let's go",
  },
  outro: {
    headline: "Employee management unlocked!",
    body: "You now know how to navigate the employee directory, use filters, view profiles, and start adding new hires. Your team data is always a click away.",
    ctaLabel: "Finish",
  },
  steps: [
    {
      id: 'page-header',
      target: '[data-demo-id="employees-page-header"]',
      placement: 'bottom',
      story: {
        title: 'Employee directory',
        body: "This is your employee hub. Every team member across all companies is listed here — searchable, filterable, and sortable.",
      },
      await: { type: 'auto', delayMs: 2500 },
    },
    {
      id: 'search-bar',
      target: '[data-demo-id="filter-search"]',
      placement: 'bottom',
      story: {
        title: 'Search instantly',
        body: "Type any name, employee ID, or keyword to filter the list in real-time. Try typing a name now.",
      },
      await: { type: 'input', selector: '[data-demo-id="filter-search"] input', minLength: 1 },
    },
    {
      id: 'company-filter',
      target: '[data-demo-id="filter-company"]',
      placement: 'bottom',
      story: {
        title: 'Filter by company',
        body: "B Group has multiple subsidiaries. Use this dropdown to narrow down to **ByteForce**, **B-Systems**, or **Business Partners**.",
      },
      await: { type: 'auto', delayMs: 3000 },
    },
    {
      id: 'status-filter',
      target: '[data-demo-id="filter-status"]',
      placement: 'bottom',
      story: {
        title: 'Filter by status',
        body: "See only **active**, **probation**, **on leave**, or **terminated** employees. Each status has its own color badge in the table.",
      },
      await: { type: 'auto', delayMs: 3000 },
    },
    {
      id: 'data-table',
      target: '[data-demo-id="employees-table"]',
      placement: 'top',
      story: {
        title: 'Employee data table',
        body: "Each row shows an employee's ID, name, department, position, salary, and status. Click any column header to sort. Click a row to view their full profile.",
      },
      await: { type: 'auto', delayMs: 3500 },
    },
    {
      id: 'add-employee-btn',
      target: '[data-demo-id="add-employee-btn"]',
      placement: 'bottom',
      story: {
        title: 'Add a new employee',
        body: "Ready to onboard someone? Click **Add Employee** to open the registration form. Let's try it now.",
      },
      await: { type: 'click', selector: '[data-demo-id="add-employee-btn"]' },
    },
    {
      id: 'add-form-personal',
      target: '[data-demo-id="form-section-personal"]',
      placement: 'bottom',
      story: {
        title: 'Personal information',
        body: "Start with the basics — full name (English & Arabic), national ID, date of birth, phone, and emergency contact. Required fields are marked with a red asterisk.",
      },
      await: { type: 'auto', delayMs: 3500 },
    },
    {
      id: 'add-form-employment',
      target: '[data-demo-id="form-section-employment"]',
      placement: 'top',
      story: {
        title: 'Employment details',
        body: "Assign the employee to a **company**, **department**, set their **position**, **level**, and **contract dates**. The department list updates based on the company you select.",
      },
      await: { type: 'auto', delayMs: 3500 },
    },
    {
      id: 'add-form-salary',
      target: '[data-demo-id="form-section-salary"]',
      placement: 'top',
      story: {
        title: 'Salary & banking',
        body: "Enter the **base salary**, choose the **currency** (EGP, QAR, AED), and fill in banking details for payroll transfers.",
      },
      await: { type: 'auto', delayMs: 3000 },
    },
    {
      id: 'save-button',
      target: '[data-demo-id="save-employee-btn"]',
      placement: 'top',
      story: {
        title: 'Save when ready',
        body: "Hit **Save Employee** to create the record. You can also **Save & Add Another** if you're onboarding multiple people. The system auto-generates their employee ID.",
      },
      await: { type: 'auto', delayMs: 3000 },
    },
  ],
}
