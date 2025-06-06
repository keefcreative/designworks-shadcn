export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="scroll-m-20 text-2xl font-bold tracking-tight">DesignWorks</h1>
          <p className="text-muted-foreground mt-2">Professional design services</p>
        </div>
        {children}
      </div>
    </div>
  )
}