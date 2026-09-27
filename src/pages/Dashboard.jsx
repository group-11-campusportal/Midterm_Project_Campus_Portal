function Dashboard({ user }) {
  return (
    <div>
      <h1 className="page-title">Dashboard</h1>
      <p className="page-subtitle">Welcome, {user?.name}</p>
    </div>
  )
}

export default Dashboard
