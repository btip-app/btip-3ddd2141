const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/90 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded bg-primary" />
          <span className="text-xl font-bold tracking-tight">BTIP</span>
        </div>
        
        <nav className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm text-muted-foreground hover:text-foreground">Features</a>
          <a href="#problem" className="text-sm text-muted-foreground hover:text-foreground">Why BTIP</a>
          <a href="#personas" className="text-sm text-muted-foreground hover:text-foreground">Use Cases</a>
          <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground">Pricing</a>
        </nav>
        
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">
            Login
          </button>
          <button className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground font-medium">
            Request Access
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
