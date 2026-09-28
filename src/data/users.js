// Hardcoded accounts for the simulated login.
// This is NOT real authentication: there is no hashing, no token, and no server.
// The `role` field is the only thing that decides what a user can see.
//
// role === "administrator"  -> the registrar / academic staff (web only)
// role === "client"         -> the student (web and mobile)

export const users = [
  {
    id: 'u1',
    username: 'admin',
    password: 'admin123',
    role: 'administrator',
    name: 'Dr. Sarah Wijaya',
    email: 'sarah.wijaya@campus.edu',
    staffId: 'STF1001',
    title: 'Registrar',
    department: 'Academic Affairs',
  },
  {
    id: 'u2',
    username: 'andi',
    password: 'student123',
    role: 'client',
    name: 'Andi Pratama',
    email: 'andi.pratama@student.campus.edu',
    studentId: 'CS2023001',
    program: 'Computer Science',
    year: 3,
  },
  {
    id: 'u3',
    username: 'bella',
    password: 'student123',
    role: 'client',
    name: 'Bella Kusuma',
    email: 'bella.kusuma@student.campus.edu',
    studentId: 'CS2023002',
    program: 'Computer Science',
    year: 3,
  },
]

// Convenience list used by the administrator's "Record a Grade" form.
export const students = users.filter((user) => user.role === 'client')
