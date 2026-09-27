function Login({ onLogin }) {
  return (
    <main className="auth">
      <div className="card">
        <h1>Login</h1>
        <button type="button" onClick={() => onLogin?.({ name: 'Admin', role: 'administrator' })}>
          Log in
        </button>
      </div>
    </main>
  )
}

export default Login
