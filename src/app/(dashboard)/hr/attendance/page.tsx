import { redirect } from 'next/navigation'

export default function AttendanceIndex() {
  redirect('/hr/attendance/today')
}
