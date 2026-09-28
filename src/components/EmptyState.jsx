function EmptyState({ title, message }) {
  return (
    <div className="empty-state" role="status">
      <p className="empty-state__title">{title}</p>
      {message ? <p className="empty-state__message">{message}</p> : null}
    </div>
  );
}
export default EmptyState;
