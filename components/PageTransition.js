"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function PageTransition({ children }) {
  const pathname = usePathname();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [isAnimating, setIsAnimating] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);

  const isAdminPage = pathname?.startsWith("/dashboard/admin");

  useEffect(() => {
    if (isAnimating) {
      const timer = setTimeout(() => setIsAnimating(false), 320);
      return () => clearTimeout(timer);
    }
  }, [isAnimating]);

  if (isAdminPage) {
    return <>{children}</>;
  }

  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setIsAnimating(true);
    setDisplayChildren(children);
  } else if (children !== displayChildren && !isAnimating) {
    setDisplayChildren(children);
  }

  return (
    <div
      key={pathname}
      className={isAnimating ? "page-slide-in" : ""}
      style={{ minHeight: "100%", width: "100%" }}
    >
      {displayChildren}
    </div>
  );
}

