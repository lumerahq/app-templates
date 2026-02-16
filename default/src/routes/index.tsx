import { createFileRoute } from '@tanstack/react-router';
import { Activity, FileText, TrendingUp, Users } from 'lucide-react';
import { useContext } from 'react';
import { StatCard } from '../components/StatCard';
import { AuthContext } from '../main';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage() {
  const auth = useContext(AuthContext);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back, {auth?.user?.name ?? 'User'}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value="1,234"
          subtitle="+12% from last month"
          icon={<Users className="size-5" />}
        />
        <StatCard
          title="Documents"
          value="856"
          subtitle="23 added today"
          icon={<FileText className="size-5" />}
        />
        <StatCard
          title="Active Sessions"
          value="42"
          subtitle="Real-time"
          icon={<Activity className="size-5" />}
        />
        <StatCard
          title="Growth Rate"
          value="+24.5%"
          subtitle="vs last quarter"
          icon={<TrendingUp className="size-5" />}
        />
      </div>

      {/* Content Area */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-6">
          <h2 className="font-semibold mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <div className="size-2 rounded-full bg-primary" />
                <span className="text-muted-foreground">Activity item {i}</span>
                <span className="ml-auto text-xs text-muted-foreground">2h ago</span>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-4 pt-4 border-t">
            Replace with your actual activity data
          </p>
        </div>

        <div className="rounded-xl border bg-card p-6">
          <h2 className="font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {['Create Report', 'Add User', 'View Analytics', 'Settings'].map((action) => (
              <button
                key={action}
                type="button"
                className="p-3 text-sm font-medium rounded-lg border bg-background hover:bg-muted transition-colors text-left"
              >
                {action}
              </button>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-4 pt-4 border-t">
            Customize these actions for your app
          </p>
        </div>
      </div>
    </div>
  );
}
