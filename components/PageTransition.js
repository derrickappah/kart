"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function PageTransition({ children }) {
  const pathname = usePathname();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [isAnimating, setIsAnimating] = useState(false);
  const prevPathname = useRef(pathname);

  useEffect(() => {
    if (pathname !== prevPathname.current) {
      // New route — trigger slide-in
      setIsAnimating(true);
      setDisplayChildren(children);
      prevPathname.current = pathname;

      // Remove animation class after it completes
      const timer = setTimeout(() => setIsAnimating(false), 320);
      return () => clearTimeout(timer);
    } else {
      setDisplayChildren(children);
    }
  }, [pathname, children]);

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
