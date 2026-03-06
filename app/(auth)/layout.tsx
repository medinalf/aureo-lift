export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ backgroundColor: 'rgb(var(--bg-primary))' }}>
      {children}
    </div>
  )
}
