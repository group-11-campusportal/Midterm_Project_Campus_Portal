// Snapshot of the Week 7 demo data. No runtime dependency on the React app.
// Passwords here are public demo credentials; only hashes are inserted into SQLite.
// Illustrative course occupancy totals are deliberately omitted.
export const fixtures = {
  "users": [
    {
      "id": "u1",
      "username": "admin",
      "password": "admin123",
      "role": "administrator",
      "name": "Dr. Sarah Wijaya",
      "email": "sarah.wijaya@campus.edu",
      "staffId": "STF1001",
      "title": "Registrar",
      "department": "Academic Affairs"
    },
    {
      "id": "u2",
      "username": "andi",
      "password": "student123",
      "role": "client",
      "name": "Andi Pratama",
      "email": "andi.pratama@student.campus.edu",
      "studentId": "CS2023001",
      "program": "Computer Science",
      "year": 3
    },
    {
      "id": "u3",
      "username": "bella",
      "password": "student123",
      "role": "client",
      "name": "Bella Kusuma",
      "email": "bella.kusuma@student.campus.edu",
      "studentId": "CS2023002",
      "program": "Computer Science",
      "year": 3
    }
  ],
  "courses": [
    {
      "id": "c1",
      "code": "CS101",
      "title": "Introduction to Programming",
      "credits": 3,
      "term": "2024/2025",
      "instructor": "Dr. Budi Hartono",
      "capacity": 40
    },
    {
      "id": "c2",
      "code": "CS201",
      "title": "Data Structures",
      "credits": 4,
      "term": "2024/2025",
      "instructor": "Dr. Budi Hartono",
      "capacity": 35
    },
    {
      "id": "c3",
      "code": "CS210",
      "title": "Discrete Mathematics",
      "credits": 3,
      "term": "2024/2025",
      "instructor": "Dr. Maya Lestari",
      "capacity": 45
    },
    {
      "id": "c4",
      "code": "CS301",
      "title": "Design and Analysis of Algorithms",
      "credits": 3,
      "term": "2024/2025",
      "instructor": "Dr. Budi Hartono",
      "capacity": 30
    },
    {
      "id": "c5",
      "code": "CS302",
      "title": "Database Systems",
      "credits": 3,
      "term": "2024/2025",
      "instructor": "Dr. Rina Marlina",
      "capacity": 35
    },
    {
      "id": "c6",
      "code": "CS310",
      "title": "Web Application Development",
      "credits": 3,
      "term": "2024/2025",
      "instructor": "Mr. Fajar Nugroho",
      "capacity": 30
    }
  ],
  "enrollments": [
    {
      "id": "e1",
      "studentId": "CS2023001",
      "studentName": "Andi Pratama",
      "courseCode": "CS201",
      "courseTitle": "Data Structures",
      "credits": 4,
      "term": "2024/2025",
      "status": "approved",
      "enrolledAt": "2025-08-18"
    },
    {
      "id": "e2",
      "studentId": "CS2023001",
      "studentName": "Andi Pratama",
      "courseCode": "CS210",
      "courseTitle": "Discrete Mathematics",
      "credits": 3,
      "term": "2024/2025",
      "status": "pending",
      "enrolledAt": "2025-08-19"
    },
    {
      "id": "e3",
      "studentId": "CS2023002",
      "studentName": "Bella Kusuma",
      "courseCode": "CS301",
      "courseTitle": "Design and Analysis of Algorithms",
      "credits": 3,
      "term": "2024/2025",
      "status": "approved",
      "enrolledAt": "2025-08-17"
    },
    {
      "id": "e4",
      "studentId": "CS2023002",
      "studentName": "Bella Kusuma",
      "courseCode": "CS302",
      "courseTitle": "Database Systems",
      "credits": 3,
      "term": "2024/2025",
      "status": "rejected",
      "enrolledAt": "2025-08-20"
    },
    {
      "id": "e5",
      "studentId": "CS2023002",
      "studentName": "Bella Kusuma",
      "courseCode": "CS310",
      "courseTitle": "Web Application Development",
      "credits": 3,
      "term": "2024/2025",
      "status": "pending",
      "enrolledAt": "2025-08-21"
    },
    {
      "id": "e6",
      "studentId": "CS2023001",
      "studentName": "Andi Pratama",
      "courseCode": "CS101",
      "courseTitle": "Introduction to Programming",
      "credits": 3,
      "term": "2024/2025",
      "status": "approved",
      "enrolledAt": "2025-08-15"
    },
    {
      "id": "e7",
      "studentId": "CS2023002",
      "studentName": "Bella Kusuma",
      "courseCode": "CS101",
      "courseTitle": "Introduction to Programming",
      "credits": 3,
      "term": "2024/2025",
      "status": "approved",
      "enrolledAt": "2025-08-15"
    },
    {
      "id": "e8",
      "studentId": "CS2023002",
      "studentName": "Bella Kusuma",
      "courseCode": "CS210",
      "courseTitle": "Discrete Mathematics",
      "credits": 3,
      "term": "2024/2025",
      "status": "approved",
      "enrolledAt": "2025-08-16"
    }
  ],
  "grades": [
    {
      "id": "g1",
      "studentId": "CS2023001",
      "studentName": "Andi Pratama",
      "courseCode": "CS101",
      "courseTitle": "Introduction to Programming",
      "credits": 3,
      "term": "2024/2025",
      "score": 88,
      "letter": "A",
      "points": 4
    },
    {
      "id": "g2",
      "studentId": "CS2023001",
      "studentName": "Andi Pratama",
      "courseCode": "CS201",
      "courseTitle": "Data Structures",
      "credits": 4,
      "term": "2024/2025",
      "score": 79,
      "letter": "B+",
      "points": 3.3
    },
    {
      "id": "g3",
      "studentId": "CS2023002",
      "studentName": "Bella Kusuma",
      "courseCode": "CS101",
      "courseTitle": "Introduction to Programming",
      "credits": 3,
      "term": "2024/2025",
      "score": 92,
      "letter": "A",
      "points": 4
    },
    {
      "id": "g4",
      "studentId": "CS2023002",
      "studentName": "Bella Kusuma",
      "courseCode": "CS210",
      "courseTitle": "Discrete Mathematics",
      "credits": 3,
      "term": "2024/2025",
      "score": 68,
      "letter": "B-",
      "points": 2.7
    }
  ]
}
