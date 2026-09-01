'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import DynamicLucideIcon from '@/components/DynamicLucideIcon';

const SWIPE_REVEAL_WIDTH = 84; // px to reveal the delete action button
const SWIPE_AUTO_DELETE_THRESHOLD = 140; // px threshold to trigger full auto-delete on release

export default function SwipeableNotificationItem({
  notification,
  getIconForType,
  getTimeAgo,
  onClick,
  onDelete,
  isOpen,
  onOpenChange,
}) {
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFullSwipe, setIsFullSwipe] = useState(false);

  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const currentTranslateRef = useRef(0);
  const directionLockedRef = useRef(null); // 'horizontal' | 'vertical' | null
  const wasOpenRef = useRef(false);
  const hasMovedRef = useRef(false);
  const containerRef = useRef(null);

  // Sync state if controlled from outside (e.g. another item opened)
  useEffect(() => {
    if (!isOpen && !isDragging && !isDeleting) {
      setTranslateX(0);
      currentTranslateRef.current = 0;
      setIsFullSwipe(false);
    } else if (isOpen && !isDragging && !isDeleting) {
      setTranslateX(-SWIPE_REVEAL_WIDTH);
      currentTranslateRef.current = -SWIPE_REVEAL_WIDTH;
    }
  }, [isOpen, isDragging, isDeleting]);

  /* ─── Delete animation trigger ───────────────────────────────────────── */
  const triggerDelete = useCallback(() => {
    if (isDeleting) return;
    setIsDeleting(true);
    setTranslateX(-500); // Fly completely off screen to the left

    // Allow time for horizontal slide + vertical height collapse before unmounting
    setTimeout(() => {
      onDelete(notification.id);
    }, 280);
  }, [isDeleting, notification.id, onDelete]);

  /* ─── Touch Gesture Handling ─────────────────────────────────────────── */
  const handleTouchStart = (e) => {
    if (isDeleting || e.touches.length !== 1) return;
    const touch = e.touches[0];
    startXRef.current = touch.clientX;
    startYRef.current = touch.clientY;
    wasOpenRef.current = currentTranslateRef.current !== 0;
    directionLockedRef.current = null;
    hasMovedRef.current = false;
  };

  const handleTouchMove = (e) => {
    if (isDeleting || !startXRef.current || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - startXRef.current;
    const deltaY = touch.clientY - startYRef.current;

    // Determine swipe direction with a small dead-zone
    if (!directionLockedRef.current) {
      if (Math.abs(deltaY) > 8 && Math.abs(deltaY) > Math.abs(deltaX)) {
        directionLockedRef.current = 'vertical';
        return; // Allow native page scroll
      }
      if (Math.abs(deltaX) > 8 && Math.abs(deltaX) >= Math.abs(deltaY)) {
        directionLockedRef.current = 'horizontal';
        setIsDragging(true);
      }
    }

    if (directionLockedRef.current === 'horizontal') {
      hasMovedRef.current = true;
      let newX;
      if (wasOpenRef.current) {
        // If starting from open position (-SWIPE_REVEAL_WIDTH)
        newX = -SWIPE_REVEAL_WIDTH + deltaX;
      } else {
        newX = deltaX;
      }

      // If dragging right beyond 0, apply resistance
      if (newX > 0) {
        newX = newX * 0.2;
      }

      currentTranslateRef.current = newX;
      setTranslateX(newX);
      setIsFullSwipe(newX < -SWIPE_AUTO_DELETE_THRESHOLD);
    }
  };

  const handleTouchEnd = () => {
    if (isDeleting) return;
    setIsDragging(false);

    if (directionLockedRef.current === 'horizontal' && hasMovedRef.current) {
      const finalX = currentTranslateRef.current;

      if (finalX < -SWIPE_AUTO_DELETE_THRESHOLD) {
        // Full swipe-left release -> auto-delete!
        triggerDelete();
      } else if (finalX < -SWIPE_REVEAL_WIDTH / 2) {
        // Partial swipe-left -> snap open to reveal Delete button
        setTranslateX(-SWIPE_REVEAL_WIDTH);
        currentTranslateRef.current = -SWIPE_REVEAL_WIDTH;
        onOpenChange?.(notification.id);
      } else {
        // Snap closed
        setTranslateX(0);
        currentTranslateRef.current = 0;
        onOpenChange?.(null);
      }
    }

    directionLockedRef.current = null;
    startXRef.current = 0;
    startYRef.current = 0;
    setIsFullSwipe(false);
  };

  /* ─── Pointer / Mouse Drag Handling (for desktop) ───────────────────── */
  const pointerStartRef = useRef({ x: 0, y: 0 });
  const isPointerDownRef = useRef(false);

  const handlePointerDown = (e) => {
    // Only handle primary button (left mouse) or pen; touch is handled by touch events
    if (e.pointerType === 'touch' || e.button !== 0 || isDeleting) return;
    isPointerDownRef.current = true;
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    wasOpenRef.current = currentTranslateRef.current !== 0;
    hasMovedRef.current = false;
  };

  const handlePointerMove = (e) => {
    if (!isPointerDownRef.current || isDeleting) return;
    const deltaX = e.clientX - pointerStartRef.current.x;
    const deltaY = e.clientY - pointerStartRef.current.y;

    if (Math.abs(deltaX) > 6 && Math.abs(deltaX) > Math.abs(deltaY)) {
      hasMovedRef.current = true;
      setIsDragging(true);

      let newX = wasOpenRef.current ? -SWIPE_REVEAL_WIDTH + deltaX : deltaX;
      if (newX > 0) newX = newX * 0.2;

      currentTranslateRef.current = newX;
      setTranslateX(newX);
      setIsFullSwipe(newX < -SWIPE_AUTO_DELETE_THRESHOLD);
    }
  };

  const handlePointerUp = () => {
    if (!isPointerDownRef.current || isDeleting) return;
    isPointerDownRef.current = false;
    setIsDragging(false);

    if (hasMovedRef.current) {
      const finalX = currentTranslateRef.current;
      if (finalX < -SWIPE_AUTO_DELETE_THRESHOLD) {
        triggerDelete();
      } else if (finalX < -SWIPE_REVEAL_WIDTH / 2) {
        setTranslateX(-SWIPE_REVEAL_WIDTH);
        currentTranslateRef.current = -SWIPE_REVEAL_WIDTH;
        onOpenChange?.(notification.id);
      } else {
        setTranslateX(0);
        currentTranslateRef.current = 0;
        onOpenChange?.(null);
      }
    }

    setIsFullSwipe(false);
  };

  /* ─── Card Click (Handles tap while open vs normal click) ─────────────── */
  const handleCardClick = (e) => {
    if (isDeleting) return;
    // If was dragging or had swiped open, close card on tap rather than navigating
    if (hasMovedRef.current) {
      hasMovedRef.current = false;
      return;
    }

    if (translateX !== 0) {
      e.stopPropagation();
      setTranslateX(0);
      currentTranslateRef.current = 0;
      onOpenChange?.(null);
      return;
    }

    onClick(notification);
  };

  /* ─── Keyboard Accessibility ─────────────────────────────────────────── */
  const handleKeyDown = (e) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      triggerDelete();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleCardClick(e);
    } else if (e.key === 'Escape') {
      setTranslateX(0);
      currentTranslateRef.current = 0;
      onOpenChange?.(null);
    }
  };

  return (
    <div
      ref={containerRef}
      role="listitem"
      className={`relative overflow-hidden transition-all duration-300 ${
        isDeleting
          ? 'max-h-0 opacity-0 mb-0 pointer-events-none scale-95'
          : 'max-h-[160px] opacity-100 mb-3'
      }`}
    >
      {/* ── Background Tray (Revealed on swipe left) ────────────────────── */}
      <div
        className={`absolute inset-0 rounded-xl flex items-center justify-end overflow-hidden transition-colors ${
          isFullSwipe
            ? 'bg-red-600 dark:bg-red-700'
            : 'bg-red-500 dark:bg-red-600'
        }`}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            triggerDelete();
          }}
          aria-label={`Delete notification: ${notification.title}`}
          className="flex flex-col items-center justify-center h-full px-5 text-white font-bold text-xs gap-1 select-none active:scale-95 transition-transform"
          style={{ width: `${SWIPE_REVEAL_WIDTH}px` }}
        >
          <DynamicLucideIcon
            name="delete"
            size={22}
            className={`text-white transition-transform ${isFullSwipe ? 'scale-125' : ''}`}
          />
          <span className="text-[11px] tracking-wide uppercase font-semibold">
            {isFullSwipe ? 'Release' : 'Delete'}
          </span>
        </button>
      </div>

      {/* ── Foreground Notification Card ───────────────────────────────── */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={handleCardClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-label={`${notification.is_read ? '' : 'Unread: '}${notification.title}. ${notification.message}. ${getTimeAgo(notification.created_at)}. Swipe left to delete.`}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)',
          touchAction: 'pan-y',
        }}
        className={`group relative flex w-full items-start gap-4 p-4 rounded-xl text-left cursor-pointer border select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#387d94] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#242428] ${
          !notification.is_read
            ? 'bg-[#f4f9fb] dark:bg-[#202e38] border-[#387d94]/20 shadow-[0_0_12px_rgba(56,125,148,0.1)]'
            : 'bg-white dark:bg-[#2A3036] border-gray-100 dark:border-gray-700/50 shadow-sm hover:shadow-md hover:border-gray-200 dark:hover:border-gray-600'
        }`}
      >
        {/* ── Unread indicator dot ───────────────────────────────────────── */}
        {!notification.is_read && (
          <span
            aria-hidden="true"
            className="absolute top-4 right-4 size-2.5 bg-[#387d94] rounded-full shadow-[0_0_8px_rgba(56,125,148,0.6)]"
          />
        )}

        {/* ── Icon / Avatar ──────────────────────────────────────────────── */}
        <span aria-hidden="true" className="shrink-0">
          {notification.data?.avatar_url || notification.avatar_url || notification.data?.avatarUrl ? (
            <img
              src={notification.data?.avatar_url || notification.avatar_url || notification.data?.avatarUrl}
              alt=""
              className="size-12 rounded-full object-cover border border-gray-200 dark:border-gray-700 shadow-sm group-hover:scale-105 transition-transform pointer-events-none"
            />
          ) : (
            <span className="size-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-[#387d94] group-hover:scale-105 transition-transform">
              <DynamicLucideIcon
                name={getIconForType(notification.type)}
                size={22}
              />
            </span>
          )}
        </span>

        {/* ── Content ────────────────────────────────────────────────────── */}
        <span className="flex-1 pr-2 min-w-0">
          <span
            className={`block text-[15px] leading-snug font-semibold truncate ${
              !notification.is_read
                ? 'text-gray-900 dark:text-white'
                : 'text-gray-700 dark:text-gray-200'
            }`}
          >
            {notification.title}
          </span>
          <span className="block text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2 text-left">
            {notification.message}
          </span>
          <span
            className={`block text-xs font-semibold mt-1.5 ${
              !notification.is_read ? 'text-[#387d94]' : 'text-gray-400 dark:text-gray-500'
            }`}
          >
            {getTimeAgo(notification.created_at)}
          </span>
        </span>

        {/* ── Desktop Hover Quick Delete Button ──────────────────────────── */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            triggerDelete();
          }}
          aria-label={`Delete notification: ${notification.title}`}
          title="Delete notification"
          className="hidden sm:flex shrink-0 self-center opacity-0 group-hover:opacity-100 focus:opacity-100 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all active:scale-90"
        >
          <DynamicLucideIcon name="delete" size={17} />
        </button>

        {/* ── Right Chevron indicator ───────────────────────────────────── */}
        <span
          aria-hidden="true"
          className="shrink-0 self-center text-gray-400 dark:text-gray-500 group-hover:text-[#387d94] dark:group-hover:text-[#387d94] group-hover:translate-x-0.5 transition-all"
        >
          <DynamicLucideIcon name="chevron_right" size={18} />
        </span>
      </div>
    </div>
  );
}
