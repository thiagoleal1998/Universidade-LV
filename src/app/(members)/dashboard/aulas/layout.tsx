export default function StudyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-background overflow-auto">
      {children}
    </div>
  )
}
