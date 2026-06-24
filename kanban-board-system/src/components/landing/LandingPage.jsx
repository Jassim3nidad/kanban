import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div className="dashboard-layout" style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <header className="navbar" style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '1rem 3rem' }}>
        <div className="nav-brand" style={{ color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img src="/logo.png" alt="Logo" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
          <span style={{ fontWeight: 700, fontSize: '1.25rem' }}>Kanban Tracker</span>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Link to="/login" className="btn btn-secondary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.875rem', textDecoration: 'none' }}>
            Login
          </Link>
          <Link to="/register" className="btn btn-primary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.875rem', textDecoration: 'none' }}>
            Register
          </Link>
        </div>
      </header>

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '5rem 2rem', textAlign: 'center', flexGrow: 1 }}>
        <div style={{ maxWidth: '800px', margin: '0 auto 4rem auto' }}>
          <h1 style={{ fontSize: '3rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em', lineHeight: '1.15', marginBottom: '1.5rem' }}>
            One workspace for your <span style={{ color: 'var(--primary)' }}>entire organization.</span>
          </h1>
          <p style={{ fontSize: '1.125rem', color: '#475569', lineHeight: '1.6', maxWidth: '640px', margin: '0 auto' }}>
            A unified platform designed to synchronize daily workflows between interns and management. Track projects, assign tasks, and monitor progress in real-time.
          </p>
          <div style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
            <Link to="/register" className="btn btn-primary" style={{ padding: '0.875rem 2rem', fontSize: '1rem', fontWeight: 600 }}>
              Get Started Free
            </Link>
            <Link to="/login" className="btn btn-secondary" style={{ padding: '0.875rem 2rem', fontSize: '1rem', fontWeight: 600 }}>
              Sign In to Workspace
            </Link>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', textAlign: 'left', marginTop: '2rem' }}>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '2rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
            <div style={{ width: '40px', height: '40px', background: 'rgba(37, 99, 235, 0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <svg style={{ width: '20px', height: '20px', fill: 'var(--primary)' }} viewBox="0 0 24 24">
                <path d="M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3M19,19H5V5H19V19M7,10H17V12H7V10M7,14H12V16H7V14M7,6H14V8H7V6Z" />
              </svg>
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.75rem' }}>Intern Workspaces</h3>
            <p style={{ color: '#475569', fontSize: '0.875rem', lineHeight: '1.6' }}>
              Dedicated Kanban boards for every team member. Interns can easily track their active projects, move tickets through development stages, and log daily progress seamlessly.
            </p>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '2rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
            <div style={{ width: '40px', height: '40px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <svg style={{ width: '20px', height: '20px', fill: 'var(--success)' }} viewBox="0 0 24 24">
                <path d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" />
              </svg>
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.75rem' }}>Admin Oversight</h3>
            <p style={{ color: '#475569', fontSize: '0.875rem', lineHeight: '1.6' }}>
              Managers have full visibility into the team's pipeline. Monitor overall activity, review completed work, spot bottlenecks, and assign new tasks directly to specific team members.
            </p>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '2rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
            <div style={{ width: '40px', height: '40px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <svg style={{ width: '20px', height: '20px', fill: 'var(--warning)' }} viewBox="0 0 24 24">
                <path d="M16,6H13V1.5C13,0.67 12.33,0 11.5,0H8.5C7.67,0 7,0.67 7,1.5V6H4C2.9,6 2,6.9 2,8V18C2,19.1 2.9,20 4,20H16C17.1,20 18,19.1 18,18V8C18,6.9 17.1,6 16,6M8,1.5H12V6H8V1.5M16,18H4V8H16V18M12,10H8V12H12V10M12,14H8V16H12V14Z" />
              </svg>
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.75rem' }}>Unified Analytics</h3>
            <p style={{ color: '#475569', fontSize: '0.875rem', lineHeight: '1.6' }}>
              Keep your projects moving forward. By centralizing communication and task management, your team can focus on shipping products rather than tracking down updates.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
