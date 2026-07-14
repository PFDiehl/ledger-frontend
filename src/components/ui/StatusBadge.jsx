const config = {
  draft:   { label: 'Draft',   cls: 'badge-gray'    },
  sent:    { label: 'Sent',    cls: 'badge-blue'    },
  paid:    { label: 'Paid',    cls: 'badge-green'   },
  overdue: { label: 'Overdue', cls: 'badge-red'     },
  pending: { label: 'Pending', cls: 'badge-amber'   },
  partial: { label: 'Partial', cls: 'badge-amber'   },
  void:    { label: 'Void',    cls: 'badge-gray'    },
};

export default function StatusBadge({ status }) {
  const { label, cls } = config[status] ?? { label: status, cls: 'badge-gray' };
  return <span className={`status-badge ${cls}`}>{label}</span>;
}
