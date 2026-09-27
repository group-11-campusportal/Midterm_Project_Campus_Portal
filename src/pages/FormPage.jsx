function FormPage({ user }) {
  return (
    <div>
      <h1 className="page-title">{user?.role === 'administrator' ? 'Record Grade' : 'Enroll in Course'}</h1>
    </div>
  )
}

export default FormPage
