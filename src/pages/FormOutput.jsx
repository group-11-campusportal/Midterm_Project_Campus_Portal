function FormOutput({ user }) {
  return (
    <div>
      <h1 className="page-title">{user?.role === 'administrator' ? 'Grade Records' : 'My Submissions'}</h1>
    </div>
  )
}

export default FormOutput
