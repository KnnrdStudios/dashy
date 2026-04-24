export type Status = 'pending' | 'done';
export type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly';

export interface Business {
  id: number;
  name: string;
  color: string;
  weekly_focus_days: string;
}

export interface Person {
  id: number;
  name: string;
  role: string;
}

export interface Task {
  id: number;
  title: string;
  description: string | null;
  business_id: number;
  assignee_id: number;
  due_date: string;
  estimated_minutes: number;
  status: Status;
  recurrence_type: Recurrence;
  recurrence_parent_id: number | null;
  created_at: string;
  completed_at: string | null;
  business_name: string;
  business_color: string;
  assignee_name: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  business_id: number;
  assignee_id: number;
  due_date: string;
  estimated_minutes?: number;
  recurrence_type?: Recurrence;
}

declare global {
  interface Window {
    api: {
      tasks: {
        list: (filters?: { date?: string; assigneeId?: number; businessId?: number }) => Promise<Task[]>;
        listRange: (startDate: string, endDate: string) => Promise<Task[]>;
        create: (task: CreateTaskInput) => Promise<Task>;
        update: (id: number, patch: Partial<CreateTaskInput>) => Promise<Task>;
        setStatus: (id: number, status: Status) => Promise<Task>;
        remove: (id: number) => Promise<{ ok: true }>;
        move: (id: number, newDate: string) => Promise<Task>;
      };
      meta: {
        businesses: () => Promise<Business[]>;
        people: () => Promise<Person[]>;
        focusForDate: (isoDate: string) => Promise<Business | null>;
      };
      quickAdd: {
        onOpen: (cb: () => void) => () => void;
      };
      export: {
        weekMarkdown: (startDate: string) => Promise<string>;
      };
    };
  }
}
