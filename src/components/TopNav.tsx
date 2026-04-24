import type { Person } from '../types';

interface Props {
  view: 'today' | 'week';
  onChangeView: (v: 'today' | 'week') => void;
  people: Person[];
  assigneeFilter: string | null;
  onChangeAssignee: (name: string | null) => void;
  onQuickAdd: () => void;
  onExport: () => void;
}

export default function TopNav({
  view, onChangeView, people, assigneeFilter, onChangeAssignee, onQuickAdd, onExport,
}: Props) {
  return (
    <div className="h-12 px-6 flex items-center justify-between border-b border-ink-800 bg-ink-900/60 backdrop-blur">
      <div className="flex items-center gap-6">
        <div className="text-sm font-semibold tracking-tight text-ink-50">Knnrd Daily</div>
        <nav className="flex items-center gap-1">
          <Tab active={view === 'today'} onClick={() => onChangeView('today')}>Today</Tab>
          <Tab active={view === 'week'} onClick={() => onChangeView('week')}>Week</Tab>
        </nav>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1 text-xs">
          <span className="text-ink-200/50 mr-2 uppercase tracking-widest">Show</span>
          <FilterChip active={assigneeFilter === null} onClick={() => onChangeAssignee(null)}>All</FilterChip>
          {people.map((p) => (
            <FilterChip
              key={p.id}
              active={assigneeFilter === p.name}
              onClick={() => onChangeAssignee(p.name)}
            >
              {p.name}
            </FilterChip>
          ))}
        </div>
        <button type="button" onClick={onExport} className="btn-ghost text-xs">Export week</button>
        <button type="button" onClick={onQuickAdd} className="btn-primary text-xs">+ Task</button>
      </div>
    </div>
  );
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'px-3 py-1 rounded-md text-sm transition-colors',
        active ? 'bg-ink-700 text-ink-50' : 'text-ink-200/70 hover:text-ink-50 hover:bg-ink-800',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'px-2 py-1 rounded-md transition-colors',
        active ? 'bg-ink-50 text-ink-900' : 'text-ink-200/70 hover:text-ink-50 hover:bg-ink-800',
      ].join(' ')}
    >
      {children}
    </button>
  );
}
