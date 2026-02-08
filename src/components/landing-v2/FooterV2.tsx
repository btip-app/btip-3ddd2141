const FooterV2 = () => {
  return (
    <footer className="py-8 border-t border-border bg-navy-deep">
      <div className="container mx-auto px-6 flex items-center justify-between">
        <span className="text-xs font-mono text-muted-foreground">
          © {new Date().getFullYear()} BTIP
        </span>
        <span className="text-xs font-mono text-muted-foreground">
          Africa-Native Threat Intelligence
        </span>
      </div>
    </footer>
  );
};

export default FooterV2;
