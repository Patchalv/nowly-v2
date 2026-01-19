import Image from 'next/image';

export function SiteFooter() {
  return (
    <footer className="bg-muted/50 border-t px-6 py-12">
      <div className="mx-auto flex max-w-lg flex-col gap-8 text-center">
        <div className="flex items-center justify-center gap-2">
          <Image
            src="/logo/nowly-icon-bg.png"
            alt="Nowly"
            width={28}
            height={28}
            className="rounded-full"
          />
          <span className="text-lg font-bold tracking-tight">nowly</span>
        </div>
        <nav className="text-muted-foreground flex justify-center gap-6 text-sm font-medium">
          <a className="hover:text-foreground transition-colors" href="#">
            Features
          </a>
          <a className="hover:text-foreground transition-colors" href="#">
            Privacy
          </a>
          <a className="hover:text-foreground transition-colors" href="#">
            Terms
          </a>
          <a className="hover:text-foreground transition-colors" href="#">
            Support
          </a>
        </nav>
        <p className="text-muted-foreground text-xs">
          © 2024 Nowly Inc. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
