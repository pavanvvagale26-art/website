import React, { useContext } from "react";
import { OrderContext } from "../context/OrderContext";
import { FaCheckCircle, FaInfoCircle, FaExclamationTriangle, FaTimesCircle } from "react-icons/fa";
import "../App.css";

export default function Toast() {
  const { toasts } = useContext(OrderContext);

  const icons = {
    success: <FaCheckCircle />,
    info: <FaInfoCircle />,
    warning: <FaExclamationTriangle />,
    error: <FaTimesCircle />,
  };

  if (!toasts.length) return null;

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast-item toast-${t.type}`}>
          <span className="toast-icon">{icons[t.type] || icons.info}</span>
          <span className="toast-message">{t.message}</span>
        </div>
      ))}
    </div>
  );
}
