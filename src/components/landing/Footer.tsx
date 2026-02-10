import { Link } from "react-router-dom";


const Footer = () => {
  return (
    <footer className="py-12 border-t border-border bg-navy-deep">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center gap-2 mb-4">

              <span className="text-xl font-bold">BTIP</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Africa-native threat intelligence platform for modern security operations.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-semibold mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
              <li><Link to="/v2#solution" className="hover:text-foreground transition-colors">Solution</Link></li>
              <li><Link to="/v2#pillars" className="hover:text-foreground transition-colors">How It Works</Link></li>
            </ul>
          </div>

          {/* Access */}
          <div>
            <h4 className="font-semibold mb-4">Access</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/auth" className="hover:text-foreground transition-colors">Sign In</Link></li>
              <li><Link to="/auth" className="hover:text-foreground transition-colors">Request Access</Link></li>
              <li><Link to="/v2" className="hover:text-foreground transition-colors">Overview</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><span className="cursor-default">Privacy Policy</span></li>
              <li><span className="cursor-default">Terms of Service</span></li>
              <li><span className="cursor-default">Security</span></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Bastion Technologies. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
