function StatusBadge({ status }) {
  const safeStatus = status || "pending";
  return <span className={`badge badge--${safeStatus}`}>{safeStatus}</span>;
}
export default StatusBadge;
