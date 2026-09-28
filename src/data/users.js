export const users = [
  {
    id: "u1",
    username: "admin",
    password: "admin123",
    role: "administrator",
    name: "Dr. Sarah Wijaya",
    email: "sarah.wijaya@campus.edu",
    staffId: "STF1001",
    title: "Registrar",
    department: "Academic Affairs",
  },
  {
    id: "u2",
    username: "andi",
    password: "student123",
    role: "client",
    name: "Andi Pratama",
    email: "andi.pratama@student.campus.edu",
    studentId: "CS2023001",
    program: "Computer Science",
    year: 3,
  },
  {
    id: "u3",
    username: "bella",
    password: "student123",
    role: "client",
    name: "Bella Kusuma",
    email: "bella.kusuma@student.campus.edu",
    studentId: "CS2023002",
    program: "Computer Science",
    year: 3,
  },
];

export const students = users.filter((user) => user.role === "client");
